const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildServer, createConfig } = require("../backend/server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function withApp(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rsport-test-"));
  const config = createConfig({
    dataFile: path.join(tmpDir, "store.json"),
    sessionSecret: "test-secret-with-enough-length-for-hmac",
    allowDemoCheckout: true,
    taxRate: 0,
    shippingFlatCents: 500,
    freeShippingThresholdCents: 15000
  });
  const server = buildServer(config);
  const baseUrl = await listen(server);
  try {
    await fn(baseUrl);
  } finally {
    await close(server);
  }
}

test("products and cart API calculate trusted totals", async () => {
  await withApp(async (baseUrl) => {
    const products = await fetch(`${baseUrl}/api/products`).then((res) => res.json());
    assert.ok(products.products.length > 0);

    const addResponse = await fetch(`${baseUrl}/api/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: products.products[0].id, quantity: 2 })
    });
    assert.equal(addResponse.status, 200);
    const cookie = addResponse.headers.get("set-cookie");
    const cart = await addResponse.json();
    assert.equal(cart.cart.items[0].quantity, 2);
    assert.equal(cart.cart.totals.subtotalCents, products.products[0].priceCents * 2);

    const getCart = await fetch(`${baseUrl}/api/cart`, {
      headers: { cookie }
    }).then((res) => res.json());
    assert.equal(getCart.cart.items.length, 1);
  });
});

test("auth uses httpOnly session cookies and protects account orders", async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "customer@example.com",
        password: "strong-password-123"
      })
    });
    assert.equal(registerResponse.status, 201);
    const cookie = registerResponse.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);

    const ordersWithoutSession = await fetch(`${baseUrl}/api/orders`);
    assert.equal(ordersWithoutSession.status, 401);

    const ordersWithSession = await fetch(`${baseUrl}/api/orders`, {
      headers: { cookie }
    });
    assert.equal(ordersWithSession.status, 200);
  });
});

test("demo checkout creates an order without accepting card data", async () => {
  await withApp(async (baseUrl) => {
    const products = await fetch(`${baseUrl}/api/products`).then((res) => res.json());
    const addResponse = await fetch(`${baseUrl}/api/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: products.products[0].id, quantity: 1 })
    });
    const cookie = addResponse.headers.get("set-cookie");

    const checkoutResponse = await fetch(`${baseUrl}/api/checkout/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie
      },
      body: JSON.stringify({
        billing: {
          firstName: "Rafael",
          lastName: "Blackwood",
          address1: "Universitatsstrasse 65",
          city: "Klagenfurt",
          region: "Carinthia",
          country: "Austria",
          phone: "+4369010111165",
          email: "customer@example.com"
        }
      })
    });
    assert.equal(checkoutResponse.status, 201);
    const checkout = await checkoutResponse.json();
    assert.equal(checkout.payment.mode, "demo");
    assert.equal(checkout.order.paymentProvider, "demo");
  });
});
