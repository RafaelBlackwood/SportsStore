(function () {
  "use strict";

  var state = {
    products: [],
    me: null,
    csrfToken: "",
    config: null,
    stripe: null,
    card: null,
    compareIds: []
  };

  var BLOG_POSTS = [
    {
      slug: "home-gym-setup",
      title: "How to Build a Home Gym That You Will Actually Use",
      image: "assets/img/blog/blog1.webp",
      date: "12/06/2026",
      author: "RSPort Team",
      excerpt: "A practical guide to choosing compact equipment, planning zones, and building a training corner that stays useful after the first week.",
      body: [
        "A good home gym starts with the way you train, not with the biggest equipment list. Choose one strength tool, one conditioning tool, and enough floor space to move safely.",
        "For most athletes, adjustable dumbbells, resistance bands, a mat, and a jump rope cover more sessions than oversized machines. Add heavier equipment only when your routine has clearly outgrown the basics.",
        "Keep the space simple and visible. If your gear is easy to reach, training feels like a normal part of the day instead of a project you have to set up from zero."
      ]
    },
    {
      slug: "boxing-glove-fit",
      title: "Boxing Glove Fit: What Beginners Usually Get Wrong",
      image: "assets/img/blog/blog2.webp",
      date: "08/06/2026",
      author: "RSPort Team",
      excerpt: "The right gloves protect your hands, help your technique, and make bag work feel cleaner from the first session.",
      body: [
        "Glove weight, wrist support, and hand-wrap space matter more than color or branding. If the glove shifts around when you punch, it is not doing its job.",
        "Beginners should avoid gloves that feel painfully tight on day one. You need a secure fit, but your knuckles and wraps still need room.",
        "For bag work and general fitness boxing, choose gloves with firm padding and a stable wrist closure. Your hands will thank you later."
      ]
    },
    {
      slug: "running-shoe-rotation",
      title: "Why a Running Shoe Rotation Can Prevent Training Burnout",
      image: "assets/img/blog/blog3.webp",
      date: "01/06/2026",
      author: "RSPort Team",
      excerpt: "Rotating shoes is not just for elite runners. It can make daily training feel fresher and reduce repeated stress.",
      body: [
        "Different shoes load your feet and legs in slightly different ways. That variety can be useful when you train often.",
        "Use a stable daily trainer for most runs, a lighter pair for faster sessions, and a recovery-friendly shoe for easy days.",
        "You do not need a huge collection. Two well-chosen pairs are enough for most runners to feel the benefit."
      ]
    },
    {
      slug: "strength-recovery",
      title: "Strength Training Recovery: Small Habits That Matter",
      image: "assets/img/blog/blog4.webp",
      date: "27/05/2026",
      author: "RSPort Team",
      excerpt: "Better recovery comes from repeatable basics: sleep, simple mobility, sensible progression, and enough food.",
      body: [
        "Recovery is not a luxury add-on. It is the part of training where your body adapts to the work you already did.",
        "Start with sleep and load management. If every session is maximal, no supplement or gadget can rescue the plan.",
        "Light mobility work, walking, hydration, and consistent protein intake will usually beat complicated recovery routines."
      ]
    },
    {
      slug: "gym-bag-checklist",
      title: "The Gym Bag Checklist for After-Work Training",
      image: "assets/img/blog/blog5.webp",
      date: "18/05/2026",
      author: "RSPort Team",
      excerpt: "A simple packing system makes spontaneous training easier and keeps forgotten gear from ruining the session.",
      body: [
        "Pack your gym bag like a tiny training station: shoes, shirt, towel, bottle, wraps or straps, and a small recovery snack.",
        "Keep a backup pair of socks and a spare lock in the side pocket. Those two tiny items save more sessions than people expect.",
        "The less you have to think before training, the more likely you are to actually go."
      ]
    },
    {
      slug: "mobility-warmup",
      title: "A Five-Minute Warmup That Makes Training Feel Better",
      image: "assets/img/blog/blog6.webp",
      date: "10/05/2026",
      author: "RSPort Team",
      excerpt: "Warmups do not need to be long. They need to prepare the joints and muscles you are about to use.",
      body: [
        "Start with one minute of easy movement to raise your temperature. Then pick three mobility drills that match the session.",
        "For lower body days, use ankle rocks, hip airplanes, and bodyweight squats. For upper body days, use shoulder circles, scapular pushups, and band pull-aparts.",
        "Finish with two light sets of the first main exercise. That bridge between warmup and work is where most sessions start to feel smooth."
      ]
    }
  ];

  var CATEGORY_LINKS = [
    { label: "Boxing", href: "shop.html?category=Boxing", detail: "Gloves and fight training" },
    { label: "Strength", href: "shop.html?category=Strength", detail: "Belts, kettlebells, racks" },
    { label: "Footwear", href: "shop.html?category=Footwear", detail: "Training shoes and sneakers" },
    { label: "Cardio", href: "shop.html?category=Cardio", detail: "Jump ropes and conditioning" },
    { label: "Recovery", href: "shop.html?category=Recovery", detail: "Bands, mobility, reset gear" },
    { label: "Apparel", href: "shop.html?category=Apparel", detail: "Performance tees and layers" },
    { label: "Accessories", href: "shop.html?category=Accessories", detail: "Bags, wraps, bottles" }
  ];

  var COLOR_STYLES = {
    Black: { hex: "#05070a", filter: "contrast(1.08) saturate(0.9) brightness(0.82)" },
    White: { hex: "#f8fafc", filter: "brightness(1.18) saturate(0.88)" },
    Red: { hex: "#ff334f", filter: "sepia(0.25) saturate(1.65) hue-rotate(315deg)" },
    Navy: { hex: "#163b8f", filter: "sepia(0.18) saturate(1.35) hue-rotate(175deg)" },
    Graphite: { hex: "#6e7781", filter: "grayscale(0.35) contrast(1.02)" },
    "Electric Blue": { hex: "#17d5ff", filter: "sepia(0.18) saturate(1.8) hue-rotate(150deg)" },
    Yellow: { hex: "#f7e642", filter: "sepia(0.4) saturate(1.45) hue-rotate(16deg) brightness(1.08)" },
    "Neon Lime": { hex: "#b8ff4d", filter: "sepia(0.35) saturate(1.7) hue-rotate(48deg) brightness(1.08)" },
    Multi: { hex: "linear-gradient(135deg, #17d5ff, #b8ff4d, #ff334f)", filter: "saturate(1.35) contrast(1.05)" }
  };

  var REVIEW_COPY = {
    "gloves-pro": {
      name: "Marta",
      date: "June 4, 2026",
      text: "The wrist support feels secure and the padding is balanced enough for long bag sessions."
    },
    "strength-belt": {
      name: "Jakub",
      date: "May 29, 2026",
      text: "Solid buckle, comfortable fit, and it stays in place during heavier sets."
    },
    "training-shoes": {
      name: "Amelia",
      date: "May 22, 2026",
      text: "Stable for lifting but still flexible enough for circuits. Exactly what I wanted."
    },
    "jump-rope-speed": {
      name: "Noah",
      date: "May 17, 2026",
      text: "The bearings are smooth and the rope is easy to adjust before warmups."
    },
    "resistance-band-set": {
      name: "Lena",
      date: "May 10, 2026",
      text: "Great range of resistance levels for rehab work, warmups, and travel sessions."
    },
    "performance-tee": {
      name: "Oskar",
      date: "May 6, 2026",
      text: "Lightweight fabric, clean cut, and it dries quickly after harder training."
    },
    "kettlebell-16": {
      name: "Kacper",
      date: "April 30, 2026",
      text: "The handle has enough room for two-hand swings and the finish grips well."
    },
    "gym-bag-elite": {
      name: "Zofia",
      date: "April 24, 2026",
      text: "The separate shoe pocket is genuinely useful and the bag feels sturdy without being bulky."
    }
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

  function unique(values) {
    return values.filter(function (value, index) {
      return value && values.indexOf(value) === index;
    });
  }

  function defaultOptionsFor(product) {
    var category = String((product && product.category) || "").toLowerCase();
    if (category === "footwear") {
      return { colors: ["Black", "White", "Electric Blue"], sizes: ["40", "41", "42", "43", "44", "45"] };
    }
    if (category === "apparel") {
      return { colors: ["Black", "White", "Neon Lime"], sizes: ["S", "M", "L", "XL"] };
    }
    if (category === "boxing") {
      return { colors: ["Black", "White", "Red", "Navy"], sizes: ["10 oz", "12 oz", "14 oz", "16 oz"] };
    }
    if (category === "strength") {
      return { colors: ["Black", "Graphite"], sizes: ["S", "M", "L", "XL"] };
    }
    if (category === "cardio") {
      return { colors: ["Black", "Red", "Yellow"], sizes: ["Adjustable"] };
    }
    if (category === "accessories") {
      return { colors: ["Black", "Red", "Graphite"], sizes: ["One size"] };
    }
    return { colors: ["Black", "Graphite"], sizes: ["One size"] };
  }

  function productOptions(product) {
    var fallback = defaultOptionsFor(product);
    return {
      colors: ((product.options && product.options.colors) || fallback.colors || []).slice(),
      sizes: ((product.options && product.options.sizes) || fallback.sizes || []).slice()
    };
  }

  function productImages(product) {
    return unique([product.image, product.secondaryImage]);
  }

  function findLoadedProduct(productId) {
    return state.products.find(function (product) {
      return product.id === productId;
    });
  }

  function productById(productId) {
    var loaded = findLoadedProduct(productId);
    if (loaded) {
      return Promise.resolve(loaded);
    }
    return api("/api/products/" + encodeURIComponent(productId)).then(function (payload) {
      return payload.product;
    });
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
    var category = params.get("category");
    var productParams = new URLSearchParams();
    if (q) {
      productParams.set("q", q);
    }
    if (category) {
      productParams.set("category", category);
    }
    var suffix = productParams.toString() ? "?" + productParams.toString() : "";
    var payload = await api("/api/products" + suffix);
    state.products = payload.products || [];
    return state.products;
  }

  function productCard(product, compact) {
    var image = product.image;
    return [
      compact ? "" : '<div class="col-lg-4 col-md-4 col-12">',
      '<article class="single_product" data-product-id="' + escapeHtml(product.id) + '">',
      "<figure>",
      '<div class="product_thumb">',
      '<a class="primary_img" href="product-details.html?id=' + encodeURIComponent(product.id) + '"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '"></a>',
      '<a class="secondary_img" href="product-details.html?id=' + encodeURIComponent(product.id) + '"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '"></a>',
      '<div class="action_links"><ul>',
      '<li class="add_to_cart"><a href="#" data-product-id="' + escapeHtml(product.id) + '" title="Add to cart"><i class="fa fa-shopping-cart" aria-hidden="true"></i></a></li>',
      '<li class="wishlist"><a href="#" data-wishlist-product="' + escapeHtml(product.id) + '" title="Add to Wishlist"><i class="fa fa-heart" aria-hidden="true"></i></a></li>',
      '<li class="compare"><a href="#" data-compare-product="' + escapeHtml(product.id) + '" title="Compare"><i class="fa fa-refresh" aria-hidden="true"></i></a></li>',
      '<li class="quick_button"><a href="#" data-quick-view="' + escapeHtml(product.id) + '" title="Quick view"><i class="fa fa-search" aria-hidden="true"></i></a></li>',
      "</ul></div>",
      "</div>",
      '<figcaption class="product_content">',
      '<h4 class="product_name"><a href="product-details.html?id=' + encodeURIComponent(product.id) + '">' + escapeHtml(product.name) + "</a></h4>",
      '<div class="price_box"><span class="current_price">' + money(product.priceCents) + "</span>" + (product.compareAtCents ? '<span class="old_price">' + money(product.compareAtCents) + "</span>" : "") + "</div>",
      "</figcaption>",
      "</figure>",
      "</article>",
      compact ? "" : "</div>"
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
      qsa(".primary_img img, .secondary_img img", article).forEach(function (image) {
        image.setAttribute("src", product.image);
        image.setAttribute("alt", product.name);
      });
      qsa(".product_name a", article).forEach(function (link) {
        link.textContent = product.name;
      });
      qsa(".price_box", article).forEach(function (box) {
        box.innerHTML =
          '<span class="current_price">' +
          money(product.priceCents) +
          "</span>" +
          (product.compareAtCents ? '<span class="old_price">' + money(product.compareAtCents) + "</span>" : "");
      });
      qsa(".product_desc p", article).forEach(function (paragraph) {
        paragraph.textContent = product.description;
      });
      qsa(".add_to_cart a", article).forEach(function (link) {
        link.dataset.productId = product.id;
        link.setAttribute("href", "#");
      });
      qsa(".wishlist a", article).forEach(function (link) {
        link.dataset.wishlistProduct = product.id;
        link.setAttribute("href", "#");
      });
      qsa(".compare a", article).forEach(function (link) {
        link.dataset.compareProduct = product.id;
        link.setAttribute("href", "#");
      });
      qsa(".product_name a, .primary_img, .secondary_img", article).forEach(function (link) {
        link.setAttribute("href", "product-details.html?id=" + encodeURIComponent(product.id));
      });
      qsa(".quick_button a", article).forEach(function (link) {
        link.dataset.quickView = product.id;
        link.setAttribute("href", "#");
        link.removeAttribute("data-bs-toggle");
        link.removeAttribute("data-bs-target");
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

  async function addToWishlist(productId) {
    await api("/api/wishlist/items", {
      method: "POST",
      body: { productId: productId }
    });
    notify("Added to wishlist.", "success");
  }

  function compareIds() {
    try {
      return JSON.parse(window.localStorage.getItem("rsport_compare_ids") || "[]");
    } catch (error) {
      return [];
    }
  }

  function saveCompareIds(ids) {
    state.compareIds = unique(ids).slice(0, 4);
    window.localStorage.setItem("rsport_compare_ids", JSON.stringify(state.compareIds));
  }

  async function addToCompare(productId) {
    var ids = compareIds();
    if (!ids.includes(productId)) {
      ids.unshift(productId);
    }
    saveCompareIds(ids);
    await renderCompareTray(true);
    notify("Added to compare.", "success");
  }

  async function renderCompareTray(open) {
    var tray = qs(".rsport-compare-tray");
    if (!tray) {
      tray = document.createElement("aside");
      tray.className = "rsport-compare-tray";
      document.body.appendChild(tray);
    }
    var ids = compareIds();
    if (!ids.length) {
      tray.classList.remove("is-open");
      tray.innerHTML = "";
      return;
    }
    var products = await Promise.all(ids.map(productById));
    tray.innerHTML = [
      '<div class="rsport-compare-head">',
      "<strong>Compare products</strong>",
      '<button type="button" data-close-compare aria-label="Close compare">x</button>',
      "</div>",
      '<div class="rsport-compare-grid">',
      products
        .map(function (product) {
          var options = productOptions(product);
          return [
            '<article class="rsport-compare-item">',
            '<button type="button" data-remove-compare="' + escapeHtml(product.id) + '" aria-label="Remove from compare">x</button>',
            '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '">',
            "<h4>" + escapeHtml(product.name) + "</h4>",
            "<p>" + escapeHtml(product.category) + "</p>",
            '<strong>' + money(product.priceCents) + "</strong>",
            '<small>Sizes: ' + escapeHtml(options.sizes.join(", ")) + "</small>",
            '<a href="product-details.html?id=' + encodeURIComponent(product.id) + '">View product</a>',
            "</article>"
          ].join("");
        })
        .join(""),
      "</div>"
    ].join("");
    if (open) {
      tray.classList.add("is-open");
    }
  }

  async function openQuickView(productId) {
    var product = await productById(productId);
    var options = productOptions(product);
    var modal = qs(".rsport-quick-view");
    if (!modal) {
      modal = document.createElement("section");
      modal.className = "rsport-quick-view";
      document.body.appendChild(modal);
    }
    modal.innerHTML = [
      '<div class="rsport-quick-view-backdrop" data-close-quick-view></div>',
      '<article class="rsport-quick-view-card" role="dialog" aria-modal="true" aria-label="' + escapeHtml(product.name) + '">',
      '<button type="button" class="rsport-quick-close" data-close-quick-view aria-label="Close quick view">x</button>',
      '<div class="rsport-quick-media"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '"></div>',
      '<div class="rsport-quick-content">',
      '<span class="rsport-kicker">' + escapeHtml(product.category) + "</span>",
      "<h3>" + escapeHtml(product.name) + "</h3>",
      '<div class="price_box"><span class="current_price">' + money(product.priceCents) + "</span>" + (product.compareAtCents ? '<span class="old_price">' + money(product.compareAtCents) + "</span>" : "") + "</div>",
      "<p>" + escapeHtml(product.description) + "</p>",
      '<p class="rsport-options-line">Sizes: ' + escapeHtml(options.sizes.join(", ")) + "</p>",
      '<div class="rsport-quick-actions">',
      '<button type="button" data-add-to-cart data-product-id="' + escapeHtml(product.id) + '">Add to cart</button>',
      '<button type="button" data-wishlist-product="' + escapeHtml(product.id) + '">Wishlist</button>',
      '<button type="button" data-compare-product="' + escapeHtml(product.id) + '">Compare</button>',
      '<a href="product-details.html?id=' + encodeURIComponent(product.id) + '">Details</a>',
      "</div>",
      "</div>",
      "</article>"
    ].join("");
    modal.classList.add("is-open");
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

  function initWishlistCompareQuickView() {
    state.compareIds = compareIds();
    renderCompareTray(false);

    document.addEventListener("click", async function (event) {
      var wishlistLink = event.target.closest("[data-wishlist-product], .wishlist a");
      if (wishlistLink) {
        var wishlistProductId =
          wishlistLink.dataset.wishlistProduct || (wishlistLink.closest(".single_product") || {}).dataset.productId;
        if (wishlistProductId) {
          event.preventDefault();
          try {
            await addToWishlist(wishlistProductId);
            if (qs(".wishlist_area")) {
              await initWishlistPage();
            }
          } catch (error) {
            notify(error.message, "error");
          }
          return;
        }
      }

      var compareLink = event.target.closest("[data-compare-product], .compare a");
      if (compareLink) {
        var compareProductId =
          compareLink.dataset.compareProduct || (compareLink.closest(".single_product") || {}).dataset.productId;
        if (compareProductId) {
          event.preventDefault();
          try {
            await addToCompare(compareProductId);
          } catch (error) {
            notify(error.message, "error");
          }
          return;
        }
      }

      var quickLink = event.target.closest("[data-quick-view]");
      if (quickLink) {
        event.preventDefault();
        try {
          await openQuickView(quickLink.dataset.quickView);
        } catch (error) {
          notify(error.message, "error");
        }
        return;
      }

      if (event.target.closest("[data-close-quick-view]")) {
        var quickView = qs(".rsport-quick-view");
        if (quickView) {
          quickView.classList.remove("is-open");
        }
        return;
      }

      var removeCompare = event.target.closest("[data-remove-compare]");
      if (removeCompare) {
        event.preventDefault();
        saveCompareIds(compareIds().filter(function (id) {
          return id !== removeCompare.dataset.removeCompare;
        }));
        await renderCompareTray(true);
        return;
      }

      if (event.target.closest("[data-close-compare]")) {
        var tray = qs(".rsport-compare-tray");
        if (tray) {
          tray.classList.remove("is-open");
        }
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
    var images = productImages(product);
    var options = productOptions(product);
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

    var gallery = qs(".product-details-tab");
    if (gallery) {
      gallery.innerHTML = [
        '<div id="img-1" class="zoomWrapper single-zoom">',
        '<img id="zoom1" src="' + escapeHtml(images[0]) + '" data-zoom-image="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(product.name) + '">',
        "</div>",
        '<div class="single-zoom-thumb">',
        '<ul class="rsport-product-thumbs">',
        images
          .map(function (image, index) {
            return [
              "<li>",
              '<button type="button" class="rsport-thumb-button ' + (index === 0 ? "active" : "") + '" data-product-image="' + escapeHtml(image) + '">',
              '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + ' view ' + (index + 1) + '">',
              "</button>",
              "</li>"
            ].join("");
          })
          .join(""),
        "</ul>",
        "</div>"
      ].join("");
    }

    var colorVariant = qs(".product_variant.color", panel);
    if (colorVariant) {
      colorVariant.innerHTML = [
        "<h3>Available Options</h3>",
        "<label>Color</label>",
        '<div class="rsport-swatches" role="list">',
        options.colors
          .map(function (color, index) {
            var style = COLOR_STYLES[color] || { hex: "#9aa4af", filter: "" };
            return [
              '<button type="button" class="rsport-color-swatch ' + (index === 0 ? "active" : "") + '" data-color="' + escapeHtml(color) + '" data-filter="' + escapeHtml(style.filter) + '" title="' + escapeHtml(color) + '">',
              '<span style="background:' + escapeHtml(style.hex) + '"></span>',
              "</button>"
            ].join("");
          })
          .join(""),
        "</div>",
        '<p class="rsport-selected-option">Selected: ' + escapeHtml(options.colors[0] || "Default") + "</p>",
        options.sizes.length
          ? [
              '<label class="rsport-size-label">Size</label>',
              '<div class="rsport-size-grid">',
              options.sizes
                .map(function (size, index) {
                  return '<button type="button" class="rsport-size-option ' + (index === 0 ? "active" : "") + '" data-size="' + escapeHtml(size) + '">' + escapeHtml(size) + "</button>";
                })
                .join(""),
              "</div>"
            ].join("")
          : ""
      ].join("");
    }

    var meta = qs(".product_meta span", panel);
    if (meta) {
      meta.innerHTML = 'Category: <a href="shop.html?category=' + encodeURIComponent(product.category) + '">' + escapeHtml(product.category) + "</a>";
    }

    var detailActions = qs(".product_d_action ul", panel);
    if (detailActions) {
      detailActions.innerHTML = [
        '<li><a href="#" data-wishlist-product="' + escapeHtml(product.id) + '" title="Add to wishlist">+ Add to Wishlist</a></li>',
        '<li><a href="#" data-compare-product="' + escapeHtml(product.id) + '" title="Compare">+ Compare</a></li>'
      ].join("");
    }

    var info = qs("#info .product_info_content");
    if (info) {
      info.innerHTML = [
        "<p>" + escapeHtml(product.description) + "</p>",
        "<p>Designed for regular training, this product keeps the focus on comfort, durability, and simple everyday performance.</p>"
      ].join("");
    }

    var sheet = qs("#sheet .product_d_table tbody");
    if (sheet) {
      sheet.innerHTML = [
        '<tr><td class="first_child">Category</td><td>' + escapeHtml(product.category) + "</td></tr>",
        '<tr><td class="first_child">Available sizes</td><td>' + escapeHtml(options.sizes.join(", ")) + "</td></tr>",
        '<tr><td class="first_child">Available colors</td><td>' + escapeHtml(options.colors.join(", ")) + "</td></tr>",
        '<tr><td class="first_child">Stock</td><td>' + escapeHtml(String(product.stock)) + " units</td></tr>"
      ].join("");
    }

    var sheetText = qs("#sheet .product_info_content");
    if (sheetText) {
      sheetText.innerHTML = "<p>All options shown here come from the product catalog, so the detail page, wishlist, and checkout stay aligned.</p>";
    }

    var review = REVIEW_COPY[product.id] || {
      name: "RSPort customer",
      date: "June 1, 2026",
      text: "Good quality, clear sizing, and fast enough for daily training use."
    };
    var reviews = qs("#reviews .reviews_wrapper");
    if (reviews) {
      reviews.innerHTML = [
        "<h2>1 review for " + escapeHtml(product.name) + "</h2>",
        '<div class="reviews_comment_box">',
        '<div class="comment_thmb"><img src="assets/img/blog/comment2.webp" alt="' + escapeHtml(review.name) + '"></div>',
        '<div class="comment_text"><div class="reviews_meta">',
        '<div class="star_rating"><ul><li><a href="#"><i class="ion-ios-star"></i></a></li><li><a href="#"><i class="ion-ios-star"></i></a></li><li><a href="#"><i class="ion-ios-star"></i></a></li><li><a href="#"><i class="ion-ios-star"></i></a></li><li><a href="#"><i class="ion-ios-star"></i></a></li></ul></div>',
        "<p><strong>" + escapeHtml(review.name) + " </strong>- " + escapeHtml(review.date) + "</p>",
        "<span>" + escapeHtml(review.text) + "</span>",
        "</div></div></div>",
        '<div class="comment_title"><h2>Add a review</h2><p>Your email address will not be published.</p></div>',
        '<div class="product_review_form"><form action="#"><div class="row"><div class="col-12"><label for="review_comment">Your review</label><textarea name="comment" id="review_comment"></textarea></div><div class="col-lg-6 col-md-6"><label for="author">Name</label><input id="author" type="text"></div><div class="col-lg-6 col-md-6"><label for="email">Email</label><input id="email" type="text"></div></div><button type="submit">Submit</button></form></div>'
      ].join("");
    }

    var navProducts = await loadProducts();
    var currentIndex = navProducts.findIndex(function (entry) {
      return entry.id === product.id;
    });
    var previous = navProducts[(currentIndex + navProducts.length - 1) % navProducts.length];
    var next = navProducts[(currentIndex + 1) % navProducts.length];
    var previousLink = qs(".product_nav .prev a", panel);
    var nextLink = qs(".product_nav .next a", panel);
    if (previousLink && previous) {
      previousLink.href = "product-details.html?id=" + encodeURIComponent(previous.id);
    }
    if (nextLink && next) {
      nextLink.href = "product-details.html?id=" + encodeURIComponent(next.id);
    }

    var related = qs(".related_products .product_carousel");
    if (related) {
      related.innerHTML = navProducts
        .filter(function (entry) {
          return entry.id !== product.id;
        })
        .slice(0, 5)
        .map(function (entry) {
          return productCard(entry, true);
        })
        .join("");
    }

    document.addEventListener("click", function (event) {
      var thumb = event.target.closest("[data-product-image]");
      if (thumb && gallery && gallery.contains(thumb)) {
        event.preventDefault();
        var target = qs("#zoom1", gallery);
        if (target) {
          target.src = thumb.dataset.productImage;
          target.dataset.zoomImage = thumb.dataset.productImage;
        }
        qsa(".rsport-thumb-button", gallery).forEach(function (button) {
          button.classList.toggle("active", button === thumb);
        });
        return;
      }

      var color = event.target.closest(".rsport-color-swatch");
      if (color && colorVariant && colorVariant.contains(color)) {
        var mainImage = qs("#zoom1");
        event.preventDefault();
        qsa(".rsport-color-swatch", colorVariant).forEach(function (button) {
          button.classList.toggle("active", button === color);
        });
        var selected = qs(".rsport-selected-option", colorVariant);
        if (selected) {
          selected.textContent = "Selected: " + color.dataset.color;
        }
        if (mainImage) {
          mainImage.style.filter = color.dataset.filter || "";
        }
        return;
      }

      var size = event.target.closest(".rsport-size-option");
      if (size && colorVariant && colorVariant.contains(size)) {
        event.preventDefault();
        qsa(".rsport-size-option", colorVariant).forEach(function (button) {
          button.classList.toggle("active", button === size);
        });
      }
    });

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

  function wishlistRows(wishlist) {
    if (!wishlist.items.length) {
      return '<tr><td colspan="6"><div class="rsport-empty">Your wishlist is empty. Add a product with the heart button and it will appear here.</div></td></tr>';
    }
    return wishlist.items
      .map(function (product) {
        return [
          "<tr>",
          '<td class="product_remove"><a href="#" data-remove-wishlist="' + escapeHtml(product.id) + '">x</a></td>',
          '<td class="product_thumb"><a href="product-details.html?id=' + encodeURIComponent(product.id) + '"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '"></a></td>',
          '<td class="product_name"><a href="product-details.html?id=' + encodeURIComponent(product.id) + '">' + escapeHtml(product.name) + "</a></td>",
          '<td class="product-price">' + money(product.priceCents) + "</td>",
          '<td class="product_quantity">' + escapeHtml(product.stockStatus || (product.stock > 0 ? "In Stock" : "Out of Stock")) + "</td>",
          '<td class="product_total"><a href="#" data-add-to-cart data-product-id="' + escapeHtml(product.id) + '">Add To Cart</a></td>',
          "</tr>"
        ].join("");
      })
      .join("");
  }

  async function initWishlistPage() {
    if (!qs(".wishlist_area")) {
      return;
    }
    var tbody = qs(".wishlist_area tbody");
    if (!tbody) {
      return;
    }
    var payload = await api("/api/wishlist");
    tbody.innerHTML = wishlistRows(payload.wishlist);
    if (tbody.dataset.rsportBound) {
      return;
    }
    tbody.dataset.rsportBound = "true";
    tbody.addEventListener("click", async function (event) {
      var remove = event.target.closest("[data-remove-wishlist]");
      if (!remove) {
        return;
      }
      event.preventDefault();
      try {
        var updated = await api("/api/wishlist/items/" + encodeURIComponent(remove.dataset.removeWishlist), {
          method: "DELETE"
        });
        tbody.innerHTML = wishlistRows(updated.wishlist);
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

  function blogUrl(slug) {
    return "blog-details.html?post=" + encodeURIComponent(slug);
  }

  function blogCard(post) {
    return [
      '<article class="single_blog rsport-blog-card">',
      "<figure>",
      '<div class="blog_thumb"><a href="' + blogUrl(post.slug) + '"><img src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.title) + '"></a></div>',
      '<figcaption class="blog_content">',
      '<h4 class="post_title"><a href="' + blogUrl(post.slug) + '">' + escapeHtml(post.title) + "</a></h4>",
      '<p class="post_date"><i class="fa fa-calendar" aria-hidden="true"></i> ' + escapeHtml(post.date) + " | " + escapeHtml(post.author) + "</p>",
      '<p class="post_desc">' + escapeHtml(post.excerpt) + "</p>",
      '<footer class="btn_more"><a href="' + blogUrl(post.slug) + '">Read article</a></footer>',
      "</figcaption>",
      "</figure>",
      "</article>"
    ].join("");
  }

  function initHomeHeroAndCategories() {
    var slides = qsa(".slider_area .single_slider");
    var slideContent = [
      {
        image: "assets/img/bg/banner7.webp",
        kicker: "Train smarter",
        title: "Gear for every serious session",
        text: "Shop boxing, strength, cardio, and recovery essentials picked for daily athletes."
      },
      {
        image: "assets/img/bg/banner1.webp",
        kicker: "Move with purpose",
        title: "Build your setup with confidence",
        text: "Trusted sports equipment, secure checkout, and fast access to the pieces you actually need."
      }
    ];
    slides.forEach(function (slide, index) {
      var content = slideContent[index % slideContent.length];
      slide.dataset.bgimg = content.image;
      slide.style.backgroundImage = "linear-gradient(90deg, rgba(12, 18, 22, 0.78), rgba(12, 18, 22, 0.2)), url(" + content.image + ")";
      var h1 = qs("h1", slide);
      var h2 = qs("h2", slide);
      var p = qs("p", slide);
      if (h1) {
        h1.textContent = content.kicker;
      }
      if (h2) {
        h2.textContent = content.title;
      }
      if (p) {
        p.textContent = content.text;
      }
    });

    qsa(".categories_menu_toggle").forEach(function (menu) {
      menu.innerHTML =
        '<ul class="rsport-category-list">' +
        CATEGORY_LINKS.map(function (category) {
          return [
            "<li>",
            '<a class="rsport-category-link" href="' + category.href + '">',
            "<span>" + escapeHtml(category.label) + "</span>",
            "<small>" + escapeHtml(category.detail) + "</small>",
            "</a>",
            "</li>"
          ].join("");
        }).join("") +
        "</ul>";
      menu.style.display = "block";
    });
  }

  function initCategoryNavigation() {
    document.addEventListener(
      "click",
      function (event) {
        var link = event.target.closest(".rsport-category-link");
        if (!link) {
          return;
        }
        event.preventDefault();
        window.location.href = link.href;
      },
      true
    );

    var sidebar = qs(".widget_list.widget_categories > ul");
    if (sidebar) {
      sidebar.innerHTML = CATEGORY_LINKS.map(function (category) {
        return '<li><a href="' + category.href + '">' + escapeHtml(category.label) + "</a></li>";
      }).join("");
    }
  }

  function initBlogContent() {
    var carousel = qs(".blog_column3");
    if (carousel) {
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.owlCarousel) {
        try {
          window.jQuery(carousel).trigger("destroy.owl.carousel");
          window.jQuery(carousel).removeClass("owl-loaded owl-hidden owl-drag");
        } catch (error) {
          // Old templates may not have initialized the carousel yet.
        }
      }
      carousel.innerHTML = BLOG_POSTS.slice(0, 6).map(blogCard).join("");
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.owlCarousel) {
        window.jQuery(carousel).owlCarousel({
          autoplay: false,
          loop: false,
          nav: true,
          items: 3,
          dots: false,
          margin: 30,
          navText: ['<i class="fa fa-chevron-left" aria-hidden="true"></i>', '<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
          responsive: {
            0: { items: 1 },
            768: { items: 2 },
            992: { items: 3 }
          }
        });
      }
    }

    var blogGrid = qs(".blog_wrapper > .row");
    if (blogGrid && qs(".blog_page_section")) {
      blogGrid.innerHTML = BLOG_POSTS.map(function (post) {
        return '<div class="col-lg-4 col-md-6">' + blogCard(post) + "</div>";
      }).join("");
    }

    var recentList = qs(".blog_sidebar_widget .recent_post_container");
    if (recentList) {
      recentList.innerHTML = BLOG_POSTS.slice(0, 4).map(function (post) {
        return [
          '<article class="recent_post">',
          '<figure><div class="post_thumb"><a href="' + blogUrl(post.slug) + '"><img src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.title) + '"></a></div>',
          '<figcaption class="post_content"><h4><a href="' + blogUrl(post.slug) + '">' + escapeHtml(post.title) + "</a></h4>",
          '<p><i class="fa fa-calendar" aria-hidden="true"></i> ' + escapeHtml(post.date) + "</p></figcaption></figure>",
          "</article>"
        ].join("");
      }).join("");
    }

    var detail = qs(".rsport-blog-detail");
    if (detail) {
      var params = new URLSearchParams(window.location.search);
      var post = BLOG_POSTS.find(function (entry) {
        return entry.slug === params.get("post");
      }) || BLOG_POSTS[0];
      detail.innerHTML = [
        '<img class="rsport-blog-hero" src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.title) + '">',
        '<p class="post_date"><i class="fa fa-calendar" aria-hidden="true"></i> ' + escapeHtml(post.date) + " | " + escapeHtml(post.author) + "</p>",
        "<h1>" + escapeHtml(post.title) + "</h1>",
        '<p class="rsport-lead">' + escapeHtml(post.excerpt) + "</p>",
        post.body.map(function (paragraph) {
          return "<p>" + escapeHtml(paragraph) + "</p>";
        }).join(""),
        '<a class="rsport-back-link" href="blog.html">Back to blog</a>'
      ].join("");
      document.title = "RSPort - " + post.title;
    }
  }

  function initSocialAuthButtons() {
    qsa(".account_form").forEach(function (formBox, index) {
      if (qs(".rsport-social-login", formBox)) {
        return;
      }
      var heading = qs("h2", formBox);
      if (!heading) {
        return;
      }
      var mode = index === 0 ? "Sign in" : "Create account";
      var wrapper = document.createElement("div");
      wrapper.className = "rsport-social-login";
      wrapper.innerHTML = [
        '<button type="button" data-social-provider="Google"><span>G</span>' + mode + " with Google</button>",
        '<button type="button" data-social-provider="Facebook"><span>f</span>' + mode + " with Facebook</button>",
        '<button type="button" data-social-provider="Apple"><span>A</span>' + mode + " with Apple</button>",
        '<button type="button" data-social-provider="X"><span>X</span>' + mode + " with X</button>"
      ].join("");
      heading.insertAdjacentElement("afterend", wrapper);
    });

    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-social-provider]");
      if (!button) {
        return;
      }
      notify(button.dataset.socialProvider + " sign-in needs OAuth keys before it can be enabled.", "error");
    });
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
      initWishlistCompareQuickView();
      initCategoryNavigation();
      initHomeHeroAndCategories();
      await initShop();
      await hydrateStaticProductCards();
      await initProductDetails();
      await initCartPage();
      await initWishlistPage();
      await initCheckoutPage();
      initAuthForms();
      initSocialAuthButtons();
      await initAccountPage();
      initBlogContent();
    } catch (error) {
      notify(error.message, "error");
    }
  });
})();
