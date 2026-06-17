(function () {
  "use strict";

  var state = {
    products: [],
    me: null,
    csrfToken: "",
    config: null,
    stripe: null,
    card: null
  };

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(cents) {
    var currency = (state.config && state.config.currency) || "eur";
    return new Intl.NumberFormat("en-AT", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format((cents || 0) / 100);
  }

  function notify(message, type) {
    var old = qs(".rsport-notice");
    if (old) {
      old.remove();
    }
    var notice = document.createElement("div");
    notice.className = "rsport-notice " + (type || "");
    notice.textContent = message;
    document.body.appendChild(notice);
    window.setTimeout(function () {
      notice.remove();
    }, 4200);
  }

  async function api(path, options) {
    var request = options || {};
    request.headers = Object.assign(
      {
        Accept: "application/json"
      },
      request.headers || {}
    );
    if (request.body && typeof request.body !== "string") {
      request.headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(request.body);
    }
    if (state.csrfToken && !["GET", "HEAD"].includes(request.method || "GET")) {
      request.headers["X-CSRF-Token"] = state.csrfToken;
    }
    request.credentials = "same-origin";

    var response = await fetch(path, request);
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error((payload.error && payload.error.message) || "Request failed.");
    }
    return payload;
  }

  async function loadConfig() {
    state.config = await api("/api/config");
  }

  async function loadMe() {
    var payload = await api("/api/auth/me");
    state.me = payload.user;
    state.csrfToken = payload.csrfToken || "";
  }

  async function loadProducts() {
    if (state.products.length) {
      return state.products;
    }
    var params = new URLSearchParams(window.location.search);
    var q = params.get("q");
    var payload = await api("/api/products" + (q ? "?q=" + encodeURIComponent(q) : ""));
    state.products = payload.products || [];
    return state.products;
  }

  function productCard(product) {
    return [
      '<div class="col-lg-4 col-md-4 col-12">',
      '<article class="single_product" data-product-id="' + escapeHtml(product.id) + '">',
      "<figure>",
      '<div class="product_thumb">',
      '<a class="primary_img" href="product-details.html?id=' + encodeURIComponent(product.id) + '"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '"></a>',
      '<a class="secondary_img" href="product-details.html?id=' + encodeURIComponent(product.id) + '"><img src="' + escapeHtml(product.secondaryImage || product.image) + '" alt="' + escapeHtml(product.name) + '"></a>',
      '<div class="action_links"><ul>',
      '<li class="add_to_cart"><a href="#" data-product-id="' + escapeHtml(product.id) + '" title="Add to cart"><i class="fa fa-shopping-cart" aria-hidden="true"></i></a></li>',
      '<li class="wishlist"><a href="wishlist.html" title="Add to Wishlist"><i class="fa fa-heart" aria-hidden="true"></i></a></li>',
      '<li class="compare"><a href="#" title="compare"><i class="fa fa-refresh" aria-hidden="true"></i></a></li>',
      '<li class="quick_button"><a href="product-details.html?id=' + encodeURIComponent(product.id) + '" title="quick view"><i class="fa fa-search" aria-hidden="true"></i></a></li>',
      "</ul></div>",
      "</div>",
      '<figcaption class="product_content">',
      '<h4 class="product_name"><a href="product-details.html?id=' + encodeURIComponent(product.id) + '">' + escapeHtml(product.name) + "</a></h4>",
      '<div class="price_box"><span class="current_price">' + money(product.priceCents) + "</span>" + (product.compareAtCents ? '<span class="old_price">' + money(product.compareAtCents) + "</span>" : "") + "</div>",
      "</figcaption>",
      "</figure>",
      "</article>",
      "</div>"
    ].join("");
  }

  async function initShop() {
    var wrapper = qs(".shop_wrapper");
    if (!wrapper) {
      return;
    }
    var products = await loadProducts();
    wrapper.innerHTML = products.length
      ? products.map(productCard).join("")
      : '<div class="col-12"><div class="rsport-empty">No products match your search.</div></div>';
    var amount = qs(".page_amount p");
    if (amount) {
      amount.textContent = products.length
        ? "Showing 1-" + products.length + " of " + products.length + " results"
        : "No products found";
    }
  }

  async function hydrateStaticProductCards() {
    var products = await loadProducts();
    if (!products.length) {
      return;
    }
    qsa(".single_product").forEach(function (article, index) {
      if (article.dataset.productId) {
        return;
      }
      var product = products[index % products.length];
      article.dataset.productId = product.id;
      qsa(".add_to_cart a", article).forEach(function (link) {
        link.dataset.productId = product.id;
        link.setAttribute("href", "#");
      });
      qsa(".product_name a, .primary_img, .secondary_img", article).forEach(function (link) {
        link.setAttribute("href", "product-details.html?id=" + encodeURIComponent(product.id));
      });
    });
  }

  async function addToCart(productId, quantity) {
    await api("/api/cart/items", {
      method: "POST",
      body: {
        productId: productId,
        quantity: quantity || 1
      }
    });
    notify("Added to cart.", "success");
  }

  function initAddToCart() {
    document.addEventListener("click", async function (event) {
      var link = event.target.closest(".add_to_cart a, [data-add-to-cart]");
      if (!link) {
        return;
      }
      var productId = link.dataset.productId || (link.closest(".single_product") || {}).dataset.productId;
      if (!productId) {
        return;
      }
      event.preventDefault();
      try {
        await addToCart(productId, Number(link.dataset.quantity || 1));
      } catch (error) {
        notify(error.message, "error");
      }
    });
  }

  async function initProductDetails() {
    if (!document.body.textContent.includes("product details") || !qs(".product_d_right")) {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var productId = params.get("id");
    var product = null;
    if (productId) {
      product = (await api("/api/products/" + encodeURIComponent(productId))).product;
    } else {
      product = (await loadProducts())[0];
    }
    if (!product) {
      return;
    }
    var panel = qs(".product_d_right");
    qs("h1", panel).textContent = product.name;
    qs(".current_price", panel).textContent = money(product.priceCents);
    var oldPrice = qs(".old_price", panel);
    if (oldPrice) {
      oldPrice.textContent = product.compareAtCents ? money(product.compareAtCents) : "";
    }
    var desc = qs(".product_desc p", panel);
    if (desc) {
      desc.textContent = product.description;
    }
    var mainImage = qs("#zoom1");
    if (mainImage) {
      mainImage.setAttribute("src", product.gallery[0] || product.image);
      mainImage.setAttribute("data-zoom-image", product.gallery[0] || product.image);
      mainImage.setAttribute("alt", product.name);
    }
    var form = qs("form", panel);
    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        var quantityInput = qs('input[type="number"]', form);
        try {
          await addToCart(product.id, Number(quantityInput && quantityInput.value ? quantityInput.value : 1));
        } catch (error) {
          notify(error.message, "error");
        }
      });
    }
  }

  function cartRows(cart) {
    if (!cart.items.length) {
      return '<tr><td colspan="6"><div class="rsport-empty">Your cart is empty.</div></td></tr>';
    }
    return cart.items
      .map(function (item) {
        return [
          "<tr>",
          '<td class="product_remove"><a href="#" data-remove-item="' + escapeHtml(item.productId) + '"><i class="fa fa-trash-o"></i></a></td>',
          '<td class="product_thumb"><a href="product-details.html?id=' + encodeURIComponent(item.productId) + '"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '"></a></td>',
          '<td class="product_name"><a href="product-details.html?id=' + encodeURIComponent(item.productId) + '">' + escapeHtml(item.name) + "</a></td>",
          '<td class="product-price">' + money(item.unitPriceCents) + "</td>",
          '<td class="product_quantity"><label>Quantity</label><input min="0" max="99" value="' + item.quantity + '" type="number" data-quantity-item="' + escapeHtml(item.productId) + '"></td>',
          '<td class="product_total">' + money(item.lineTotalCents) + "</td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  function renderTotals(totals, root) {
    var amounts = qsa(".cart_amount", root || document);
    if (amounts[0]) {
      amounts[0].textContent = money(totals.subtotalCents);
    }
    if (amounts[1]) {
      amounts[1].innerHTML = "<span>Flat Rate:</span> " + money(totals.shippingCents);
    }
    if (amounts[2]) {
      amounts[2].textContent = money(totals.totalCents);
    }
  }

  async function refreshCart() {
    return (await api("/api/cart")).cart;
  }

  async function initCartPage() {
    if (!qs(".shopping_cart_area")) {
      return;
    }
    var tbody = qs(".cart_page tbody");
    var cart = await refreshCart();
    tbody.innerHTML = cartRows(cart);
    renderTotals(cart.totals, qs(".coupon_area"));

    var checkout = qs(".checkout_btn a");
    if (checkout) {
      checkout.setAttribute("href", "checkout.html");
    }
    document.addEventListener("change", async function (event) {
      if (!event.target.matches("[data-quantity-item]")) {
        return;
      }
      try {
        var updated = await api("/api/cart/items/" + encodeURIComponent(event.target.dataset.quantityItem), {
          method: "PATCH",
          body: { quantity: Number(event.target.value) }
        });
        tbody.innerHTML = cartRows(updated.cart);
        renderTotals(updated.cart.totals, qs(".coupon_area"));
      } catch (error) {
        notify(error.message, "error");
      }
    });
    document.addEventListener("click", async function (event) {
      var remove = event.target.closest("[data-remove-item]");
      if (!remove) {
        return;
      }
      event.preventDefault();
      try {
        var updated = await api("/api/cart/items/" + encodeURIComponent(remove.dataset.removeItem), {
          method: "DELETE"
        });
        tbody.innerHTML = cartRows(updated.cart);
        renderTotals(updated.cart.totals, qs(".coupon_area"));
      } catch (error) {
        notify(error.message, "error");
      }
    });
  }

  function checkoutOrderRows(cart) {
    if (!cart.items.length) {
      return '<tr><td colspan="2">Your cart is empty.</td></tr>';
    }
    return cart.items
      .map(function (item) {
        return '<tr><td>' + escapeHtml(item.name) + " <strong>x " + item.quantity + "</strong></td><td>" + money(item.lineTotalCents) + "</td></tr>";
      })
      .join("");
  }

  function fillCheckoutOrder(cart) {
    var table = qs(".order_table table");
    if (!table) {
      return;
    }
    qs("tbody", table).innerHTML = checkoutOrderRows(cart);
    qs("tfoot", table).innerHTML = [
      "<tr><th>Cart Subtotal</th><td>" + money(cart.totals.subtotalCents) + "</td></tr>",
      "<tr><th>Shipping</th><td><strong>" + money(cart.totals.shippingCents) + "</strong></td></tr>",
      "<tr><th>VAT</th><td><strong>" + money(cart.totals.taxCents) + "</strong></td></tr>",
      '<tr class="order_total"><th>Order Total</th><td><strong>' + money(cart.totals.totalCents) + "</strong></td></tr>"
    ].join("");
  }

  function checkoutValue(index) {
    var form = qs(".checkout_form .col-lg-6 form");
    var fields = qsa("input, select, textarea", form);
    var field = fields[index];
    if (!field) {
      return "";
    }
    if (field.tagName === "SELECT") {
      return field.options[field.selectedIndex] ? field.options[field.selectedIndex].text : field.value;
    }
    return field.value || "";
  }

  function collectBilling() {
    return {
      firstName: checkoutValue(0),
      lastName: checkoutValue(1),
      company: checkoutValue(2),
      country: checkoutValue(3),
      address1: checkoutValue(4),
      address2: checkoutValue(5),
      city: checkoutValue(6),
      region: checkoutValue(7),
      phone: checkoutValue(8),
      email: checkoutValue(9),
      postalCode: ""
    };
  }

  function checkoutCreateAccount() {
    var form = qs(".checkout_form .col-lg-6 form");
    var fields = qsa("input, select, textarea", form);
    return {
      enabled: Boolean(fields[10] && fields[10].checked),
      password: fields[11] ? fields[11].value : ""
    };
  }

  async function loadStripe() {
    if (!state.config.stripePublishableKey) {
      return null;
    }
    if (state.stripe) {
      return state.stripe;
    }
    await new Promise(function (resolve, reject) {
      if (window.Stripe) {
        resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    state.stripe = window.Stripe(state.config.stripePublishableKey);
    return state.stripe;
  }

  async function initCheckoutPage() {
    if (!qs(".Checkout_section")) {
      return;
    }
    var cart = await refreshCart();
    fillCheckoutOrder(cart);

    var method = qs(".payment_method");
    if (!method) {
      return;
    }
    method.innerHTML = [
      '<div class="rsport-payment-box">',
      "<h4>Secure card payment</h4>",
      '<div id="rsport-payment-status" class="rsport-status"></div>',
      '<div id="rsport-card-element" class="rsport-card-element"></div>',
      '<p class="rsport-secure-note">Card details are handled by Stripe. This store never stores raw card data.</p>',
      '<div class="order_button"><button id="rsport-pay-button" type="button">Place secure order</button></div>',
      "</div>"
    ].join("");

    var status = qs("#rsport-payment-status");
    var cardElement = qs("#rsport-card-element");
    if (state.config.paymentsConfigured) {
      try {
        var stripe = await loadStripe();
        var elements = stripe.elements();
        state.card = elements.create("card");
        state.card.mount("#rsport-card-element");
        status.textContent = "Stripe checkout is ready.";
      } catch (error) {
        status.textContent = "Stripe could not load. Check your internet connection and keys.";
        status.classList.add("error");
      }
    } else {
      cardElement.style.display = "none";
      status.textContent = state.config.demoCheckoutEnabled
        ? "Local demo checkout is enabled. Add Stripe keys before production."
        : "Checkout is not configured. Add Stripe keys on the server.";
    }

    qs("#rsport-pay-button").addEventListener("click", async function () {
      try {
        var account = checkoutCreateAccount();
        var payload = {
          billing: collectBilling(),
          createAccount: account.enabled,
          password: account.password,
          note: (qs("#order_note") || {}).value || ""
        };
        status.textContent = "Creating your order...";
        var intent = await api("/api/checkout/intent", {
          method: "POST",
          body: payload
        });

        if (intent.payment.mode === "stripe") {
          var stripe = await loadStripe();
          status.textContent = "Confirming payment securely...";
          var result = await stripe.confirmCardPayment(intent.payment.clientSecret, {
            payment_method: {
              card: state.card,
              billing_details: {
                name: payload.billing.firstName + " " + payload.billing.lastName,
                email: payload.billing.email,
                phone: payload.billing.phone,
                address: {
                  line1: payload.billing.address1,
                  line2: payload.billing.address2,
                  city: payload.billing.city,
                  state: payload.billing.region,
                  country: payload.billing.country
                }
              }
            }
          });
          if (result.error) {
            throw new Error(result.error.message);
          }
          await api("/api/checkout/finalize", {
            method: "POST",
            body: {
              orderId: intent.order.id,
              paymentIntentId: result.paymentIntent.id
            }
          });
        }

        status.classList.remove("error");
        status.textContent = "Order " + intent.order.orderNumber + " was placed successfully.";
        notify("Order placed successfully.", "success");
        fillCheckoutOrder(await refreshCart());
      } catch (error) {
        status.classList.add("error");
        status.textContent = error.message;
        notify(error.message, "error");
      }
    });
  }

  function initAuthForms() {
    if (!qs(".customer_login")) {
      return;
    }
    var forms = qsa(".account_form form");
    var loginForm = forms[0];
    var registerForm = forms[1];
    if (loginForm) {
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        var inputs = qsa("input", loginForm);
        try {
          await api("/api/auth/login", {
            method: "POST",
            body: {
              email: inputs[0].value,
              password: inputs[1].value
            }
          });
          window.location.href = "my-account.html";
        } catch (error) {
          notify(error.message, "error");
        }
      });
    }
    if (registerForm) {
      registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        var inputs = qsa("input", registerForm);
        try {
          await api("/api/auth/register", {
            method: "POST",
            body: {
              email: inputs[0].value,
              password: inputs[1].value
            }
          });
          window.location.href = "my-account.html";
        } catch (error) {
          notify(error.message, "error");
        }
      });
    }
  }

  async function initAccountPage() {
    if (!qs(".account_dashboard")) {
      return;
    }
    var dashboard = qs("#dashboard p");
    if (!state.me) {
      if (dashboard) {
        dashboard.innerHTML = 'Please <a href="login.html">log in</a> to view your orders and account details.';
      }
      return;
    }
    if (dashboard) {
      dashboard.textContent = "Welcome back, " + state.me.name + ". You can review your recent orders and account details here.";
    }
    var orders = (await api("/api/orders")).orders;
    var tbody = qs("#orders tbody");
    if (tbody) {
      tbody.innerHTML = orders.length
        ? orders
            .map(function (order) {
              return [
                "<tr>",
                "<td>" + escapeHtml(order.orderNumber) + "</td>",
                "<td>" + new Date(order.createdAt).toLocaleDateString() + "</td>",
                "<td>" + escapeHtml(order.status) + "</td>",
                "<td>" + money(order.totals.totalCents) + " for " + order.items.length + " item(s)</td>",
                '<td><a href="cart.html" class="view">view</a></td>',
                "</tr>"
              ].join("");
            })
            .join("")
        : '<tr><td colspan="5">No orders yet.</td></tr>';
    }
    var logout = qs('.dashboard-list a[href="login.html"]');
    if (logout) {
      logout.addEventListener("click", async function (event) {
        event.preventDefault();
        await api("/api/auth/logout", { method: "POST" });
        window.location.href = "login.html";
      });
    }
  }

  function initSearch() {
    qsa(".search_box form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var value = (qs("input", form) || {}).value || "";
        window.location.href = "shop.html?q=" + encodeURIComponent(value.trim());
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      await loadConfig();
      await loadMe();
      initSearch();
      initAddToCart();
      await initShop();
      await hydrateStaticProductCards();
      await initProductDetails();
      await initCartPage();
      await initCheckoutPage();
      initAuthForms();
      await initAccountPage();
    } catch (error) {
      notify(error.message, "error");
    }
  });
})();
