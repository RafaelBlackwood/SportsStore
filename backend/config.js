const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT_DIR = path.resolve(__dirname, "..");

function loadDotEnv(fileName) {
  const envPath = path.join(ROOT_DIR, fileName);
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function readInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFloat(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBool(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function createConfig(overrides = {}) {
  loadDotEnv(".env");
  loadDotEnv(".env.local");

  const env = { ...process.env, ...overrides.env };
  const nodeEnv = overrides.nodeEnv || env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const sessionSecret =
    overrides.sessionSecret ||
    env.SESSION_SECRET ||
    (isProduction ? "" : crypto.randomBytes(48).toString("hex"));

  if (isProduction && sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  return {
    rootDir: ROOT_DIR,
    nodeEnv,
    isProduction,
    port: readInt(overrides.port || env.PORT, 3000),
    publicUrl: overrides.publicUrl || env.APP_PUBLIC_URL || "http://localhost:3000",
    sessionSecret,
    sessionTtlSeconds: readInt(env.SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
    maxJsonBytes: readInt(env.MAX_JSON_BYTES, 1024 * 1024),
    dataFile:
      overrides.dataFile ||
      env.STORE_DATA_FILE ||
      path.join(ROOT_DIR, "backend", "data", "store.json"),
    seedFile:
      overrides.seedFile ||
      path.join(ROOT_DIR, "backend", "data", "store.seed.json"),
    currency: String(overrides.currency || env.CURRENCY || "eur").toLowerCase(),
    shippingFlatCents: readInt(
      overrides.shippingFlatCents || env.SHIPPING_FLAT_CENTS,
      500
    ),
    freeShippingThresholdCents: readInt(
      overrides.freeShippingThresholdCents || env.FREE_SHIPPING_THRESHOLD_CENTS,
      15000
    ),
    taxRate: readFloat(overrides.taxRate || env.TAX_RATE, 0.2),
    allowDemoCheckout: readBool(
      overrides.allowDemoCheckout ?? env.ALLOW_DEMO_CHECKOUT,
      !isProduction
    ),
    stripe: {
      publishableKey: overrides.stripePublishableKey || env.STRIPE_PUBLISHABLE_KEY || "",
      secretKey: overrides.stripeSecretKey || env.STRIPE_SECRET_KEY || "",
      webhookSecret: overrides.stripeWebhookSecret || env.STRIPE_WEBHOOK_SECRET || ""
    },
    allowedOrigins: (overrides.allowedOrigins || env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  };
}

module.exports = {
  ROOT_DIR,
  createConfig
};
