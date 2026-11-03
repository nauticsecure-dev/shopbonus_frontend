// Invoked by the isolated backend capture script with --browser. No intercepted APIs.
const { chromium, expect } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const api = process.env.LOCAL_ACCEPTANCE_API;
const workspace = process.env.LOCAL_ACCEPTANCE_WORKSPACE;
const offer = process.env.LOCAL_ACCEPTANCE_OFFER;
if (!api || !workspace || !offer) throw new Error('Run the backend isolated capture script with --browser.');
const site = 'http://127.0.0.1:3334';
const log = fs.openSync('docs/merchant-voucher-local-browser.log', 'w');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3334'], {
  windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env,
    NEXT_PUBLIC_API_BASE_URL: api, NEXT_PUBLIC_APP_URL: site, SHOPBONUS_NEXT_DIST_DIR: '.next-voucher-local' },
});
let browser;
let page;
const responses = [];
(async () => {
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (server.exitCode !== null) throw new Error('Next server exited before readiness.');
      try { if ((await fetch(site, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Next server readiness timed out.');
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext();
    page = await context.newPage();
    page.on('response', response => { if (response.url().startsWith(api)) responses.push({ status: response.status(), path: new URL(response.url()).pathname }); });
    page.on('requestfailed', request => responses.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
    page.setDefaultTimeout(90000);
    await page.addInitScript(() => localStorage.setItem('shopbonus-locale', 'nl'));
    const headers = { Accept: 'application/json', Origin: site, Referer: site + '/' };
    expect((await context.request.get(api + '/sanctum/csrf-cookie', { headers })).status()).toBe(204);
    const csrf = async () => decodeURIComponent((await context.cookies(api)).find(c => c.name === 'XSRF-TOKEN').value);
    const login = await context.request.post(api + '/login', { headers: { ...headers, 'X-XSRF-TOKEN': await csrf() },
      data: { email: 'merchant-dashboard@example.test', password: 'password' } });
    expect(login.status(), await login.text()).toBe(200);
    const dashboardPath = '/api/v1/workspaces/' + workspace + '/dashboard';
    const loaded = page.waitForResponse(r => r.url().includes(dashboardPath) && r.status() === 200);
    await page.goto(site + '/dashboard', { timeout: 90000 });
    expect((await (await loaded).json()).data.kpis.available_codes).toBe(2);
    await expect(page.getByRole('region', { name: 'Voorraad en verval' })).toContainText('Gereserveerde codes 0');
    await page.screenshot({ path: 'docs/merchant-voucher-local-desktop.png', fullPage: true });
    const mutate = async (path, data) => {
      const response = await context.request.post(api + '/api/v1/workspaces/' + workspace + path,
        { headers: { ...headers, 'X-XSRF-TOKEN': await csrf() }, data });
      expect(response.ok(), await response.text()).toBeTruthy();
      return response.json();
    };
    const preview = await mutate('/offers/' + offer + '/code-imports', { codes: 'SYNTHETIC-BROWSER-0003' });
    await mutate('/code-imports/' + preview.data.id + '/commit', {});
    const refreshed = page.waitForResponse(r => r.url().includes(dashboardPath) && r.status() === 200);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect((await (await refreshed).json()).data.kpis.available_codes).toBe(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(site + '/dashboard/offers', { timeout: 90000 });
    await expect(page.getByText('Inventory HTTP acceptance', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Bewerken', exact: true }).click();
    await expect(page.getByText('Aanbieding bewerken', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'docs/merchant-voucher-local-mobile.png', fullPage: true });
    const timings = [];
    for (const path of [dashboardPath, '/api/v1/workspaces/' + workspace + '/offers']) {
      const samples = [];
      for (let i = 0; i < 35; i++) {
        const start = performance.now();
        const response = await context.request.get(api + path, { headers });
        expect(response.status()).toBe(200);
        await response.body();
        if (i >= 5) samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      timings.push({ path, samples: samples.length, warmup: 5, concurrency: 1,
        p95_ms: Math.round(samples[Math.ceil(samples.length * .95) - 1] * 100) / 100 });
    }
    fs.writeFileSync('docs/merchant-voucher-local-acceptance.json', JSON.stringify({
      captured_at: new Date().toISOString(), environment: 'Local PHP HTTP/SQLite + Next dev + real Chrome; synthetic merchant session and records; no request interception',
      checks: ['real login and CSRF', 'desktop dashboard', 'real import reflected after focus refresh', '390px offer editor without horizontal overflow'],
      dataset: { webshops: 1, offers: 1, codes: 3 }, timings,
      limitation: 'Small local sequential dev-server sample; not representative staging P95 or provider/concurrency evidence',
    }, null, 2) + '\n');
    console.log('Local real-API browser acceptance passed.');
  } catch (error) {
    fs.writeFileSync('docs/merchant-voucher-local-failure.json', JSON.stringify({ message: error.message, url: page?.url(), responses }, null, 2));
    if (page) await page.screenshot({ path: 'docs/merchant-voucher-local-failure.png', fullPage: true }).catch(() => {});
    throw error;
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]);
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10000 });
    else server.kill();
    fs.closeSync(log);
  }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
