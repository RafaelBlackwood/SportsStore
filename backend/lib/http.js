const fs = require("node:fs");
const path = require("node:path");
const { HttpError } = require("./errors");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject"
};

function securityHeaders(config) {
  const scriptSources = ["'self'"];
  if (config.stripe.publishableKey) {
    scriptSources.push("https://js.stripe.com");
  }

  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src ${scriptSources.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  };
}

function applySecurityHeaders(res, config) {
  for (const [key, value] of Object.entries(securityHeaders(config))) {
    res.setHeader(key, value);
  }
}

function sendJson(res, statusCode, payload, headers = {}) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendError(res, error) {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message =
    error instanceof HttpError ? error.message : "Something went wrong on the server.";
  sendJson(res, statusCode, {
    error: {
      message,
      details: error.details || undefined
    }
  });
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new HttpError(413, "Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req, maxBytes) {
  const raw = await readRawBody(req, maxBytes);
  if (!raw.length) {
    return {};
  }
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Expected application/json request body.");
  }
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function safeStaticPath(rootDir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = path.resolve(rootDir, relative);
  if (!candidate.startsWith(rootDir)) {
    return null;
  }
  return candidate;
}

function serveStatic(req, res, frontendDir) {
  let filePath = safeStaticPath(frontendDir, new URL(req.url, "http://localhost").pathname);
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(frontendDir, "index.html");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", CONTENT_TYPES[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=86400");
  fs.createReadStream(filePath).pipe(res);
}

module.exports = {
  applySecurityHeaders,
  readJson,
  readRawBody,
  sendError,
  sendJson,
  serveStatic
};
