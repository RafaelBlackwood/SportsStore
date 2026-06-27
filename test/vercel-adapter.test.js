const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

test("Vercel adapter forwards rewritten API paths to the backend", async (t) => {
  const dataFile = path.join(os.tmpdir(), `rsport-vercel-test-${process.pid}.json`);
  process.env.VERCEL = "1";
  process.env.NODE_ENV = "development";
  process.env.STORE_DATA_FILE = dataFile;

  const handler = require("../api/server");
  const server = http.createServer(handler);

  t.after(() => {
    server.close();
    fs.rmSync(dataFile, { force: true });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/?path=config`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.currency, "eur");
});
