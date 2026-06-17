const crypto = require("node:crypto");
const { HttpError } = require("./errors");
const { safeEqual } = require("./security");

function paymentsConfigured(config) {
  return Boolean(config.stripe.secretKey && config.stripe.publishableKey);
}

async function createPaymentIntent(config, order) {
  if (!paymentsConfigured(config)) {
    throw new HttpError(503, "Stripe checkout is not configured.");
  }

  const params = new URLSearchParams();
  params.set("amount", String(order.totals.totalCents));
  params.set("currency", config.currency);
  params.set("description", `RSPort order ${order.orderNumber}`);
  params.set("receipt_email", order.email);
  params.set("automatic_payment_methods[enabled]", "true");
  params.set("metadata[orderId]", order.id);
  params.set("metadata[orderNumber]", order.orderNumber);

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": order.id
    },
    body: params
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload?.error?.message || "Stripe could not create the payment."
    );
  }
  return payload;
}

async function retrievePaymentIntent(config, paymentIntentId) {
  if (!paymentsConfigured(config)) {
    throw new HttpError(503, "Stripe checkout is not configured.");
  }
  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
    {
      headers: {
        Authorization: `Bearer ${config.stripe.secretKey}`
      }
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload?.error?.message || "Stripe could not verify the payment."
    );
  }
  return payload;
}

function verifyStripeWebhook(rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) {
  if (!webhookSecret) {
    throw new HttpError(503, "Stripe webhook secret is not configured.");
  }
  const parts = String(signatureHeader || "")
    .split(",")
    .map((part) => part.split("="))
    .reduce((acc, [key, value]) => {
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(value);
      return acc;
    }, {});

  const timestamp = Number(parts.t?.[0]);
  const signatures = parts.v1 || [];
  if (!timestamp || !signatures.length) {
    throw new HttpError(400, "Stripe webhook signature is invalid.");
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSeconds) {
    throw new HttpError(400, "Stripe webhook signature is too old.");
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");

  const valid = signatures.some((signature) => safeEqual(signature, expected));
  if (!valid) {
    throw new HttpError(400, "Stripe webhook signature verification failed.");
  }

  return JSON.parse(rawBody.toString("utf8"));
}

module.exports = {
  createPaymentIntent,
  paymentsConfigured,
  retrievePaymentIntent,
  verifyStripeWebhook
};
