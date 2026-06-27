const os = require("node:os");
const path = require("node:path");
const { buildServer } = require("../backend/server");

// Vercel Functions can only write to /tmp. This keeps preview/demo carts working,
// but production deployments should use a durable database.
if (process.env.VERCEL && !process.env.STORE_DATA_FILE) {
  process.env.STORE_DATA_FILE = path.join(os.tmpdir(), "rsport-store.json");
}

const server = buildServer();

module.exports = function handler(req, res) {
  const requestUrl = new URL(req.url, "http://localhost");
  const forwardedPath = requestUrl.searchParams.get("path") || "";
  requestUrl.searchParams.delete("path");

  const apiPath = forwardedPath.replace(/^\/+/, "");
  req.url = "/api" + (apiPath ? "/" + apiPath : "") + requestUrl.search;
  server.emit("request", req, res);
};
