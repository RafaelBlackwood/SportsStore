const http = require("node:http");
const path = require("node:path");
const { createConfig } = require("./config");
const { JsonStore } = require("./lib/datastore");
const { HttpError, assertHttp } = require("./lib/errors");
const {
  applySecurityHeaders,
  readJson,
  readRawBody,
  sendError,
  sendJson,
  serveStatic
} = require("./lib/http");
const {
  RateLimiter,
  createCsrfToken,
  hashPassword,
  parseCookies,
  randomId,
  requireCsrf,
  sameOriginAllowed,
  serializeCookie,
  setCookie,
  signToken,
  verifyPassword,
  verifyToken
} = require("./lib/security");
const {
  cleanAddress,
  cleanEmail,
  cleanPassword,
  cleanQuantity,
  cleanString,
  optionalString
} = require("./lib/validation");
const {
  createPaymentIntent,
  paymentsConfigured,
  retrievePaymentIntent,
  verifyStripeWebhook
} = require("./lib/payments");

const SESSION_COOKIE = "rsport_session";
const CART_COOKIE = "rsport_cart";

function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    stock: product.stock,
    image: product.image,
    secondaryImage: product.secondaryImage,
    gallery: product.gallery || [],
    featured: Boolean(product.featured),
    options: product.options || defaultProductOptions(product.category)
  };
}

function defaultProductOptions(category) {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "footwear") {
    return { colors: ["Black", "White", "Electric Blue"], sizes: ["40", "41", "42", "43", "44", "45"] };
  }
  if (normalized === "apparel") {
    return { colors: ["Black", "White", "Neon Lime"], sizes: ["S", "M", "L", "XL"] };
  }
  if (normalized === "boxing") {
    return { colors: ["Black", "White", "Red", "Navy"], sizes: ["10 oz", "12 oz", "14 oz", "16 oz"] };
  }
  if (normalized === "strength") {
    return { colors: ["Black", "Graphite"], sizes: ["S", "M", "L", "XL"] };
  }
  if (normalized === "cardio") {
    return { colors: ["Black", "Red", "Yellow"], sizes: ["Adjustable"] };
  }
  if (normalized === "accessories") {
    return { colors: ["Black", "Red", "Graphite"], sizes: ["One size"] };
  }
  return { colors: ["Black", "Graphite"], sizes: ["One size"] };
}

function publicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  };
}

function makeOrderNumber(state) {
  const next = (state.orders?.length || 0) + 1;
  return `RS-${String(next).padStart(6, "0")}`;
}

function findProduct(state, productId) {
  return state.products.find((product) => product.id === productId);
}

function normalizeCart(cart) {
  cart.items = (cart.items || []).filter((item) => item.quantity > 0);
  return cart;
}

function cartCookieOptions(config, maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "Lax",
    secure: config.isProduction,
    maxAge
  };
}

function sessionCookieOptions(config, maxAge = config.sessionTtlSeconds) {
  return {
    httpOnly: true,
    sameSite: "Lax",
    secure: config.isProduction,
    maxAge
  };
}

function getRequestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local")
    .split(",")[0]
    .trim();
}

function calculateTotals(state, rawCart, config, couponCode) {
  const cart = normalizeCart(rawCart || { items: [] });
  const items = cart.items.map((item) => {
    const product = findProduct(state, item.productId);
    assertHttp(product, 400, "Cart contains a product that no longer exists.");
    const quantity = Math.min(item.quantity, product.stock);
    assertHttp(quantity > 0, 400, `${product.name} is out of stock.`);
    return {
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * quantity
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  let discountCents = 0;
  let coupon = null;
  const code = optionalString(couponCode, "Coupon", 40).toUpperCase();
  if (code) {
    coupon = state.coupons.find((entry) => entry.code === code && entry.active);
    assertHttp(coupon, 400, "Coupon code is not valid.");
    assertHttp(coupon.uses < coupon.maxUses, 400, "Coupon code is no longer available.");
    discountCents = Math.round((subtotalCents * coupon.percentOff) / 100);
  }

  const shippingCents =
    subtotalCents > 0 && subtotalCents < config.freeShippingThresholdCents
      ? config.shippingFlatCents
      : 0;
  const taxableCents = Math.max(0, subtotalCents - discountCents + shippingCents);
  const taxCents = Math.round(taxableCents * config.taxRate);
  const totalCents = taxableCents + taxCents;

  return {
    items,
    couponCode: coupon?.code || "",
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    currency: config.currency
  };
}

function formatCart(state, cart, config) {
  const totals = calculateTotals(state, cart, config);
  return {
    id: cart.id,
    items: totals.items,
    totals
  };
}

function formatWishlist(state, wishlist) {
  return {
    id: wishlist.id,
    items: (wishlist.productIds || [])
      .map((productId) => findProduct(state, productId))
      .filter(Boolean)
      .map((product) => ({
        ...publicProduct(product),
        stockStatus: product.stock > 0 ? "In Stock" : "Out of Stock"
      }))
  };
}

function getCartFromRequest(req, res, store, config, session) {
  const cookies = parseCookies(req.headers.cookie);
  const now = new Date().toISOString();

  if (session) {
    return store.update((state) => {
      let cart = state.carts.find((entry) => entry.userId === session.userId);
      if (!cart) {
        cart = {
          id: randomId("cart"),
          userId: session.userId,
          items: [],
          createdAt: now,
          updatedAt: now
        };
        state.carts.push(cart);
      }
      return cart;
    });
  }

  const payload = verifyToken(cookies[CART_COOKIE], config.sessionSecret);
  return store.update((state) => {
    let cart = payload?.cid
      ? state.carts.find((entry) => entry.id === payload.cid && !entry.userId)
      : null;
    if (!cart) {
      cart = {
        id: randomId("cart"),
        userId: null,
        items: [],
        createdAt: now,
        updatedAt: now
      };
      state.carts.push(cart);
    }
    const token = signToken({ cid: cart.id, purpose: "cart" }, config.sessionSecret, 60 * 60 * 24 * 30);
    setCookie(res, serializeCookie(CART_COOKIE, token, cartCookieOptions(config)));
    return cart;
  });
}

function clearCart(store, cartId) {
  if (!cartId) {
    return;
  }
  store.update((state) => {
    const cart = state.carts.find((entry) => entry.id === cartId);
    if (cart) {
      cart.items = [];
      cart.updatedAt = new Date().toISOString();
    }
  });
}

function mergeGuestCart(store, guestCartId, userId) {
  if (!guestCartId) {
    return;
  }
  store.update((state) => {
    state.wishlists = state.wishlists || [];
    const guest = state.carts.find((cart) => cart.id === guestCartId && !cart.userId);
    if (guest) {
      let userCart = state.carts.find((cart) => cart.userId === userId);
      if (!userCart) {
        userCart = {
          id: randomId("cart"),
          userId,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.carts.push(userCart);
      }
      for (const item of guest.items) {
        const existing = userCart.items.find((entry) => entry.productId === item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          userCart.items.push({ ...item });
        }
      }
      state.carts = state.carts.filter((cart) => cart.id !== guest.id);
    }

    const guestWishlist = state.wishlists.find((wishlist) => wishlist.cartId === guestCartId && !wishlist.userId);
    if (guestWishlist) {
      let userWishlist = state.wishlists.find((wishlist) => wishlist.userId === userId);
      if (!userWishlist) {
        userWishlist = {
          id: randomId("wish"),
          userId,
          cartId: "",
          productIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.wishlists.push(userWishlist);
      }
      for (const productId of guestWishlist.productIds || []) {
        if (!userWishlist.productIds.includes(productId)) {
          userWishlist.productIds.push(productId);
        }
      }
      userWishlist.updatedAt = new Date().toISOString();
      state.wishlists = state.wishlists.filter((wishlist) => wishlist.id !== guestWishlist.id);
    }
  });
}

function getWishlistFromRequest(req, res, store, config, session) {
  const now = new Date().toISOString();
  const cart = getCartFromRequest(req, res, store, config, session);
  return store.update((state) => {
    state.wishlists = state.wishlists || [];
    let wishlist = session
      ? state.wishlists.find((entry) => entry.userId === session.userId)
      : state.wishlists.find((entry) => entry.cartId === cart.id && !entry.userId);
    if (!wishlist) {
      wishlist = {
        id: randomId("wish"),
        userId: session?.userId || null,
        cartId: session ? "" : cart.id,
        productIds: [],
        createdAt: now,
        updatedAt: now
      };
      state.wishlists.push(wishlist);
    }
    return wishlist;
  });
}

function createSession(res, store, config, userId) {
  const session = {
    id: randomId("sess"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString()
  };
  store.update((state) => {
    state.sessions = state.sessions.filter((entry) => new Date(entry.expiresAt).getTime() > Date.now());
    state.sessions.push(session);
  });
  const token = signToken(
    { sid: session.id, uid: userId, purpose: "session" },
    config.sessionSecret,
    config.sessionTtlSeconds
  );
  setCookie(res, serializeCookie(SESSION_COOKIE, token, sessionCookieOptions(config)));
  return session;
}

function getSession(req, store, config) {
  const cookies = parseCookies(req.headers.cookie);
  const payload = verifyToken(cookies[SESSION_COOKIE], config.sessionSecret);
  if (!payload || payload.purpose !== "session") {
    return null;
  }
  const state = store.read();
  const session = state.sessions.find(
    (entry) => entry.id === payload.sid && entry.userId === payload.uid
  );
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }
  const user = state.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return null;
  }
  return {
    ...session,
    user
  };
}

function requireUser(session) {
  if (!session) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  return session.user;
}

function route(method, pattern, handler) {
  const parts = pattern.split("/").filter(Boolean);
  return {
    method,
    pattern,
    match(pathname) {
      const requestParts = pathname.split("/").filter(Boolean);
      if (requestParts.length !== parts.length) {
        return null;
      }
      const params = {};
      for (let i = 0; i < parts.length; i += 1) {
        const expected = parts[i];
        const actual = requestParts[i];
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          return null;
        }
      }
      return params;
    },
    handler
  };
}

function createApi(config, store) {
  const rateLimiter = new RateLimiter({ windowMs: 60 * 1000, max: 120 });
  const authLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, max: 25 });
  const routes = [];

  const add = (method, pattern, handler) => routes.push(route(method, pattern, handler));

  add("GET", "/api/health", async ({ res }) => {
    sendJson(res, 200, { ok: true, service: "rsport-store", time: new Date().toISOString() });
  });

  add("GET", "/api/config", async ({ res }) => {
    sendJson(res, 200, {
      currency: config.currency,
      taxRate: config.taxRate,
      stripePublishableKey: config.stripe.publishableKey,
      paymentsConfigured: paymentsConfigured(config),
      demoCheckoutEnabled: config.allowDemoCheckout && !paymentsConfigured(config)
    });
  });

  add("GET", "/api/products", async ({ req, res }) => {
    const url = new URL(req.url, config.publicUrl);
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    const category = (url.searchParams.get("category") || "").trim().toLowerCase();
    const state = store.read();
    let products = state.products;
    if (search) {
      products = products.filter((product) =>
        [product.name, product.category, product.description].join(" ").toLowerCase().includes(search)
      );
    }
    if (category) {
      products = products.filter((product) => product.category.toLowerCase() === category);
    }
    sendJson(res, 200, {
      products: products.map(publicProduct)
    });
  });

  add("GET", "/api/products/:id", async ({ params, res }) => {
    const state = store.read();
    const product = findProduct(state, params.id);
    assertHttp(product, 404, "Product not found.");
    sendJson(res, 200, { product: publicProduct(product) });
  });

  add("GET", "/api/cart", async ({ req, res, session }) => {
    const cart = getCartFromRequest(req, res, store, config, session);
    sendJson(res, 200, { cart: formatCart(store.read(), cart, config) });
  });

  add("GET", "/api/wishlist", async ({ req, res, session }) => {
    const wishlist = getWishlistFromRequest(req, res, store, config, session);
    sendJson(res, 200, { wishlist: formatWishlist(store.read(), wishlist) });
  });

  add("POST", "/api/wishlist/items", async ({ req, res, session }) => {
    const body = await readJson(req, config.maxJsonBytes);
    const productId = cleanString(body.productId, "Product", { max: 80 });
    const wishlist = getWishlistFromRequest(req, res, store, config, session);
    const updatedWishlist = store.update((state) => {
      const product = findProduct(state, productId);
      assertHttp(product, 404, "Product not found.");
      const activeWishlist = state.wishlists.find((entry) => entry.id === wishlist.id);
      if (!activeWishlist.productIds.includes(productId)) {
        activeWishlist.productIds.push(productId);
      }
      activeWishlist.updatedAt = new Date().toISOString();
      return activeWishlist;
    });
    sendJson(res, 200, { wishlist: formatWishlist(store.read(), updatedWishlist) });
  });

  add("DELETE", "/api/wishlist/items/:productId", async ({ req, res, params, session }) => {
    const wishlist = getWishlistFromRequest(req, res, store, config, session);
    const updatedWishlist = store.update((state) => {
      const activeWishlist = state.wishlists.find((entry) => entry.id === wishlist.id);
      activeWishlist.productIds = activeWishlist.productIds.filter((productId) => productId !== params.productId);
      activeWishlist.updatedAt = new Date().toISOString();
      return activeWishlist;
    });
    sendJson(res, 200, { wishlist: formatWishlist(store.read(), updatedWishlist) });
  });

  add("POST", "/api/cart/items", async ({ req, res, session }) => {
    const body = await readJson(req, config.maxJsonBytes);
    const productId = cleanString(body.productId, "Product", { max: 80 });
    const quantity = cleanQuantity(body.quantity || 1);
    assertHttp(quantity > 0, 400, "Quantity must be at least 1.");
    const cart = getCartFromRequest(req, res, store, config, session);
    const updatedCart = store.update((state) => {
      const product = findProduct(state, productId);
      assertHttp(product, 404, "Product not found.");
      assertHttp(product.stock > 0, 400, "This product is out of stock.");
      const activeCart = state.carts.find((entry) => entry.id === cart.id);
      const existing = activeCart.items.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity = Math.min(product.stock, existing.quantity + quantity);
      } else {
        activeCart.items.push({ productId, quantity: Math.min(product.stock, quantity) });
      }
      activeCart.updatedAt = new Date().toISOString();
      return activeCart;
    });
    sendJson(res, 200, { cart: formatCart(store.read(), updatedCart, config) });
  });

  add("PATCH", "/api/cart/items/:productId", async ({ req, res, params, session }) => {
    const body = await readJson(req, config.maxJsonBytes);
    const quantity = cleanQuantity(body.quantity);
    const cart = getCartFromRequest(req, res, store, config, session);
    const updatedCart = store.update((state) => {
      const activeCart = state.carts.find((entry) => entry.id === cart.id);
      const product = findProduct(state, params.productId);
      assertHttp(product, 404, "Product not found.");
      const existing = activeCart.items.find((item) => item.productId === params.productId);
      if (!existing && quantity > 0) {
        activeCart.items.push({ productId: params.productId, quantity: Math.min(product.stock, quantity) });
      } else if (existing && quantity === 0) {
        activeCart.items = activeCart.items.filter((item) => item.productId !== params.productId);
      } else if (existing) {
        existing.quantity = Math.min(product.stock, quantity);
      }
      activeCart.updatedAt = new Date().toISOString();
      return activeCart;
    });
    sendJson(res, 200, { cart: formatCart(store.read(), updatedCart, config) });
  });

  add("DELETE", "/api/cart/items/:productId", async ({ req, res, params, session }) => {
    const cart = getCartFromRequest(req, res, store, config, session);
    const updatedCart = store.update((state) => {
      const activeCart = state.carts.find((entry) => entry.id === cart.id);
      activeCart.items = activeCart.items.filter((item) => item.productId !== params.productId);
      activeCart.updatedAt = new Date().toISOString();
      return activeCart;
    });
    sendJson(res, 200, { cart: formatCart(store.read(), updatedCart, config) });
  });

  add("POST", "/api/auth/register", async ({ req, res }) => {
    authLimiter.check(`${getRequestIp(req)}:register`);
    const body = await readJson(req, config.maxJsonBytes);
    const email = cleanEmail(body.email);
    const password = cleanPassword(body.password);
    const name = optionalString(body.name, "Name", 120) || email.split("@")[0];
    const existingGuestCart = verifyToken(parseCookies(req.headers.cookie)[CART_COOKIE], config.sessionSecret);

    const passwordHash = await hashPassword(password);
    const user = store.update((state) => {
      assertHttp(!state.users.some((entry) => entry.email === email), 409, "An account already exists for this email.");
      const newUser = {
        id: randomId("usr"),
        email,
        name,
        passwordHash,
        roles: ["customer"],
        createdAt: new Date().toISOString()
      };
      state.users.push(newUser);
      return newUser;
    });
    const session = createSession(res, store, config, user.id);
    mergeGuestCart(store, existingGuestCart?.cid, user.id);
    setCookie(res, serializeCookie(CART_COOKIE, "", cartCookieOptions(config, 0)));
    sendJson(res, 201, {
      user: publicUser(user),
      csrfToken: createCsrfToken(session.id, config)
    });
  });

  add("POST", "/api/auth/login", async ({ req, res }) => {
    authLimiter.check(`${getRequestIp(req)}:login`);
    const body = await readJson(req, config.maxJsonBytes);
    const email = cleanEmail(body.email);
    const password = cleanString(body.password, "Password", { max: 200 });
    const existingGuestCart = verifyToken(parseCookies(req.headers.cookie)[CART_COOKIE], config.sessionSecret);
    const user = store.read().users.find((entry) => entry.email === email);
    assertHttp(user && (await verifyPassword(password, user.passwordHash)), 401, "Email or password is incorrect.");
    const session = createSession(res, store, config, user.id);
    mergeGuestCart(store, existingGuestCart?.cid, user.id);
    setCookie(res, serializeCookie(CART_COOKIE, "", cartCookieOptions(config, 0)));
    sendJson(res, 200, {
      user: publicUser(user),
      csrfToken: createCsrfToken(session.id, config)
    });
  });

  add("POST", "/api/auth/logout", async ({ res, session }) => {
    if (session) {
      store.update((state) => {
        state.sessions = state.sessions.filter((entry) => entry.id !== session.id);
      });
    }
    setCookie(res, serializeCookie(SESSION_COOKIE, "", sessionCookieOptions(config, 0)));
    sendJson(res, 200, { ok: true });
  });

  add("GET", "/api/auth/me", async ({ res, session }) => {
    sendJson(res, 200, {
      user: publicUser(session?.user),
      csrfToken: session ? createCsrfToken(session.id, config) : ""
    });
  });

  add("GET", "/api/orders", async ({ res, session }) => {
    const user = requireUser(session);
    const orders = store
      .read()
      .orders.filter((order) => order.userId === user.id)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    sendJson(res, 200, { orders });
  });

  add("POST", "/api/checkout/intent", async ({ req, res, session }) => {
    const body = await readJson(req, config.maxJsonBytes);
    const cart = getCartFromRequest(req, res, store, config, session);
    const billing = cleanAddress(body.billing);
    const shipping = body.shipping ? cleanAddress(body.shipping) : billing;
    const note = optionalString(body.note, "Order note", 1000);
    const couponCode = optionalString(body.couponCode, "Coupon", 40);

    let user = session?.user || null;
    if (!user && body.createAccount) {
      const password = cleanPassword(body.password);
      const passwordHash = await hashPassword(password);
      user = store.update((state) => {
        assertHttp(
          !state.users.some((entry) => entry.email === billing.email),
          409,
          "An account already exists for this email."
        );
        const newUser = {
          id: randomId("usr"),
          email: billing.email,
          name: `${billing.firstName} ${billing.lastName}`,
          passwordHash,
          roles: ["customer"],
          createdAt: new Date().toISOString()
        };
        state.users.push(newUser);
        return newUser;
      });
      createSession(res, store, config, user.id);
    }

    const order = store.update((state) => {
      const activeCart = state.carts.find((entry) => entry.id === cart.id);
      assertHttp(activeCart && activeCart.items.length, 400, "Your cart is empty.");
      const totals = calculateTotals(state, activeCart, config, couponCode);
      assertHttp(totals.items.length > 0, 400, "Your cart is empty.");
      for (const item of totals.items) {
        const product = findProduct(state, item.productId);
        assertHttp(product.stock >= item.quantity, 400, `${product.name} does not have enough stock.`);
      }
      const newOrder = {
        id: randomId("ord"),
        orderNumber: makeOrderNumber(state),
        cartId: activeCart.id,
        userId: user?.id || null,
        email: billing.email,
        billing,
        shipping,
        note,
        items: totals.items,
        totals,
        status: paymentsConfigured(config) ? "awaiting_payment" : "placed_demo",
        paymentStatus: paymentsConfigured(config) ? "requires_payment" : "demo_paid",
        paymentProvider: paymentsConfigured(config) ? "stripe" : "demo",
        paymentIntentId: "",
        stockAdjustedAt: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.orders.push(newOrder);
      return newOrder;
    });

    if (paymentsConfigured(config)) {
      const paymentIntent = await createPaymentIntent(config, order);
      store.update((state) => {
        const savedOrder = state.orders.find((entry) => entry.id === order.id);
        savedOrder.paymentIntentId = paymentIntent.id;
        savedOrder.paymentStatus = paymentIntent.status;
      });
      sendJson(res, 201, {
        order: { ...order, paymentIntentId: paymentIntent.id, paymentStatus: paymentIntent.status },
        payment: {
          mode: "stripe",
          publishableKey: config.stripe.publishableKey,
          clientSecret: paymentIntent.client_secret
        }
      });
      return;
    }

    assertHttp(
      config.allowDemoCheckout,
      503,
      "Checkout is not configured. Add Stripe keys to enable secure payments."
    );
    clearCart(store, cart.id);
    sendJson(res, 201, {
      order,
      payment: {
        mode: "demo",
        message: "Demo checkout completed without collecting payment details."
      }
    });
  });

  add("POST", "/api/checkout/finalize", async ({ req, res }) => {
    const body = await readJson(req, config.maxJsonBytes);
    const orderId = cleanString(body.orderId, "Order", { max: 80 });
    const paymentIntentId = cleanString(body.paymentIntentId, "Payment intent", { max: 120 });
    const intent = await retrievePaymentIntent(config, paymentIntentId);
    assertHttp(intent.metadata?.orderId === orderId, 400, "Payment does not match this order.");
    const order = markOrderFromPaymentIntent(store, intent);
    sendJson(res, 200, { order });
  });

  add("POST", "/api/payments/webhook", async ({ req, res }) => {
    const rawBody = await readRawBody(req, config.maxJsonBytes);
    const event = verifyStripeWebhook(
      rawBody,
      req.headers["stripe-signature"],
      config.stripe.webhookSecret
    );
    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      markOrderFromPaymentIntent(store, event.data.object);
    }
    sendJson(res, 200, { received: true });
  });

  return async function handleApi(req, res) {
    const pathname = new URL(req.url, config.publicUrl).pathname;
    const routeMatch = routes
      .filter((candidate) => candidate.method === req.method)
      .map((candidate) => ({ route: candidate, params: candidate.match(pathname) }))
      .find((candidate) => candidate.params);

    if (!routeMatch) {
      throw new HttpError(404, "API route not found.");
    }

    rateLimiter.check(`${getRequestIp(req)}:${pathname}`);
    if (!sameOriginAllowed(req, config)) {
      throw new HttpError(403, "Cross-origin requests are not allowed.");
    }

    const session = getSession(req, store, config);
    requireCsrf(req, session, config);
    await routeMatch.route.handler({
      req,
      res,
      params: routeMatch.params,
      session
    });
  };
}

function markOrderFromPaymentIntent(store, paymentIntent) {
  return store.update((state) => {
    const orderId = paymentIntent.metadata?.orderId;
    const order = state.orders.find((entry) => entry.id === orderId);
    assertHttp(order, 404, "Order not found.");
    if (order.status === "paid" && paymentIntent.status !== "succeeded") {
      return order;
    }
    order.paymentIntentId = paymentIntent.id;
    order.paymentStatus = paymentIntent.status;
    order.updatedAt = new Date().toISOString();
    if (paymentIntent.status === "succeeded") {
      order.status = "paid";
      if (!order.stockAdjustedAt) {
        for (const item of order.items) {
          const product = findProduct(state, item.productId);
          if (product) {
            product.stock = Math.max(0, product.stock - item.quantity);
          }
        }
        order.stockAdjustedAt = new Date().toISOString();
      }
      const cart = state.carts.find(
        (entry) => entry.id === order.cartId || (order.userId && entry.userId === order.userId)
      );
      if (cart) {
        cart.items = [];
      }
    } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "canceled") {
      order.status = "payment_failed";
    }
    return order;
  });
}

function buildServer(config = createConfig()) {
  const store = new JsonStore(config);
  const handleApi = createApi(config, store);
  const frontendDir = path.join(config.rootDir, "frontend");

  return http.createServer(async (req, res) => {
    applySecurityHeaders(res, config);
    try {
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      const pathname = new URL(req.url, config.publicUrl).pathname;
      if (pathname.startsWith("/api/")) {
        await handleApi(req, res);
        return;
      }

      if (!["GET", "HEAD"].includes(req.method)) {
        throw new HttpError(405, "Method not allowed.");
      }
      serveStatic(req, res, frontendDir);
    } catch (error) {
      sendError(res, error);
    }
  });
}

function start() {
  const config = createConfig();
  const server = buildServer(config);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${config.port} is already in use.`);
      console.error(`Stop the existing server or run this app on another port: $env:PORT=3001; npm start`);
      process.exit(1);
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(config.port, () => {
    console.log(`RSPort store running at http://localhost:${config.port}`);
    if (!paymentsConfigured(config)) {
      console.log("Stripe keys are not configured. Local demo checkout is enabled only outside production.");
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  buildServer,
  createApi,
  createConfig
};
