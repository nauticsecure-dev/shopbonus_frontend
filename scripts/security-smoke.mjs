import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function withServer(demo, check) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, NODE_ENV: "production", ENABLE_DEMO_MODE: String(demo), DATABASE_URL: "" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output = (output + chunk).slice(-8000); });
  child.stderr.on("data", chunk => { output = (output + chunk).slice(-8000); });
  let spawnError;
  child.on("error", error => { spawnError = error; });
  const request = (path, init = {}) => fetch(origin + path, { ...init, signal: AbortSignal.timeout(20000) });
  try {
    let ready = false;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
      try {
        await request("/api/webshops");
        ready = true;
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    assert.ok(ready, `Server did not become ready: ${output}`);
    await check(request);
  } finally {
    if (child.exitCode === null) {
      const closed = once(child, "exit");
      child.kill();
      await closed;
    }
  }
}

await withServer(false, async request => {
  for (const path of ["/api/dashboard/admin", "/api/dashboard/merchant", "/api/vouchers", "/api/transactions"]) {
    const response = await request(path, { headers: { cookie: 'shopbonus-session={"role":"admin"}', "x-role": "admin" } });
    assert.equal(response.status, 403, path);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(await response.json(), { error: "Demo endpoint disabled" });
  }
  console.log("PASS: private demo APIs deny requests, including forged client roles");
  for (const path of ["/account", "/admin", "/dashboard", "/dashboard/settings", "/profiel", "/mijn-voordelen", "/voor-webshops"]) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
  }
  console.log("PASS: production demo pages return not found");

  let previousNonce;
  for (let index = 0; index < 2; index++) {
    const response = await request("/", { headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src *" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const policy = response.headers.get("content-security-policy");
    const scriptPolicy = policy.split(";").find(directive => directive.trim().startsWith("script-src"));
    assert.doesNotMatch(scriptPolicy, /unsafe-inline|unsafe-eval|attacker/);
    const nonce = scriptPolicy.match(/'nonce-([^']+)'/)[1];
    assert.notEqual(nonce, previousNonce);
    previousNonce = nonce;
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)];
    assert.ok(scripts.length > 0);
    for (const [tag] of scripts) assert.ok(tag.includes(`nonce="${nonce}"`), `Missing nonce: ${tag}`);
  }
  console.log("PASS: CSP nonces match rendered scripts, change per request and override forged headers");
  for (const path of ["/webshops", "/kortingscodes", "/over-ons", "/hoe-werkt-het"]) {
    assert.equal((await request(path)).status, 200, path);
  }
  const catalog = await request("/api/webshops");
  assert.equal(catalog.status, 200);
  assert.ok(Array.isArray((await catalog.json()).data));
  const health = await request("/api/health");
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false });
  console.log("PASS: marketing URLs and catalog work; health fails without leaking configuration");
});

await withServer(true, async request => {
  assert.equal((await request("/account")).status, 200);
  assert.equal((await request("/admin")).status, 200);
  assert.equal((await request("/api/dashboard/merchant")).status, 200);
  assert.equal((await request("/api/dashboard/admin")).status, 200);
  console.log("PASS: explicitly enabled demonstration remains available");
});
