const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { HttpError } = require("./errors");

const scrypt = promisify(crypto.scrypt);

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function randomId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

function hmac(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password, passwordHash) {
  const [scheme, n, r, p, salt, stored] = String(passwordHash).split("$");
  if (scheme !== "scrypt" || !salt || !stored) {
    return false;
  }
  const derivedKey = await scrypt(password, salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  });
  return safeEqual(derivedKey.toString("base64url"), stored);
}

function signToken(payload, secret, ttlSeconds) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const encoded = base64Url(JSON.stringify(body));
  return `${encoded}.${hmac(encoded, secret)}`;
}

function verifyToken(token, secret) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature || !safeEqual(signature, hmac(encoded, secret))) {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64Url(encoded).toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey) {
      return cookies;
    }
    cookies[rawKey] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function setCookie(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  res.setHeader("Set-Cookie", Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
}

function sameOriginAllowed(req, config) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return true;
  }

  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  const allowed = new Set(config.allowedOrigins);
  allowed.add(config.publicUrl);

  try {
    const originUrl = new URL(origin);
    const host = req.headers.host;
    if (host && originUrl.host === host) {
      return true;
    }
  } catch {
    return false;
  }

  return allowed.has(origin);
}

function createCsrfToken(sessionId, config) {
  return signToken({ sid: sessionId, purpose: "csrf" }, config.sessionSecret, 60 * 60 * 2);
}

function verifyCsrfToken(token, sessionId, config) {
  const payload = verifyToken(token, config.sessionSecret);
  return Boolean(payload && payload.purpose === "csrf" && payload.sid === sessionId);
}

function requireCsrf(req, session, config) {
  if (!session || ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return;
  }
  const token = req.headers["x-csrf-token"];
  if (!verifyCsrfToken(token, session.id, config)) {
    throw new HttpError(403, "Security token is missing or expired.");
  }
}

class RateLimiter {
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    this.entries = new Map();
  }

  check(key) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > this.max) {
      throw new HttpError(429, "Too many requests. Please wait a moment and try again.");
    }
  }
}

module.exports = {
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
  safeEqual,
  verifyPassword,
  verifyToken
};
