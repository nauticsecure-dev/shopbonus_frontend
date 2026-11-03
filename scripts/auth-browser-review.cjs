// Real local Laravel + SQLite and Chrome. Only the failed-logout test injects responses.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const api = process.env.AUTH_REVIEW_API, site = 'http://127.0.0.1:3336';
if (!api) throw new Error('Run PHP scripts/auth-browser-review.php from the backend.');
const checks = [], exchanges = [];
checks.push = (...items) => { for (const item of items) console.log('PASS:', item); return Array.prototype.push.apply(checks, items); };
const log = fs.openSync('docs/auth-browser-server.log', 'w');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3336'], {
  windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env,
    NEXT_PUBLIC_API_BASE_URL: api, NEXT_PUBLIC_APP_URL: site, NEXT_PUBLIC_USE_COOKIE_AUTH: 'true', SHOPBONUS_NEXT_DIST_DIR: '.next-auth-review' },
});
const probe = (action, email) => {
  const result = spawnSync(process.env.AUTH_REVIEW_PHP, ['-d', 'xdebug.mode=off', 'scripts/auth-browser-review.php', 'probe', action, email], {
    cwd: path.resolve('../shopbonus_backend'), env: process.env, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
let browser, page;
(async () => {
  try {
    for (let attempt = 0; ; attempt++) {
      if (server.exitCode !== null || attempt > 90) throw new Error('Next startup failed.');
      try { if ((await fetch(site + '/account', { signal: AbortSignal.timeout(60000) })).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('response', async response => {
      if (response.url().startsWith(api)) {
        exchanges.push({ path: new URL(response.url()).pathname, status: response.status() });
        if (response.request().method() === 'POST' && response.status() >= 400) console.log('Auth response:', response.status(), new URL(response.url()).pathname, await response.text());
      }
    });
    await page.addInitScript(() => localStorage.setItem('shopbonus-locale', 'en'));
    const submit = () => page.locator('form button[type=submit]').click();
    const waitPost = (url, status) => page.waitForResponse(r => r.url() === api + url && r.request().method() === 'POST' && r.status() === status);
    const headers = { Accept: 'application/json', Origin: site, Referer: site + '/' };
    const me = () => context.request.get(api + '/api/v1/me', { headers });
    const logout = async () => {
      const cookies = await context.cookies(api);
      const xsrf = decodeURIComponent(cookies.find(c => c.name === 'XSRF-TOKEN').value);
      expect((await context.request.post(api + '/logout', { headers: { ...headers, 'X-XSRF-TOKEN': xsrf } })).status()).toBe(204);
    };
    await page.goto(site + '/account?role=consumer');
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    await expect(page.locator('#name')).toBeVisible();
    await page.locator('#name').fill('Auth Review');
    await page.locator('#name').press('Tab');
    await expect(page.locator('#email')).toBeFocused();
    await page.locator('#email').fill('consumer@auth-review.test');
    await page.locator('#password').fill('Auth-review-password-2026');
    await page.locator('#consent').check();
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    const registered = waitPost('/register', 201);
    await submit(); await registered;
    await expect(page.locator('#verification')).toBeFocused();
    checks.push('Consumer registration through real CSRF/session; verification receives keyboard focus');
    await page.reload();
    await expect(page.locator('#verification')).toBeVisible();
    await expect(page.locator('#verification')).toBeFocused();
    checks.push('Unverified session resumes verification after reload');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'docs/auth-verification-mobile.png', fullPage: true });
    const verified = waitPost('/api/v1/auth/email/verify-code', 200);
    await page.locator('#verification').fill(probe('code', 'consumer@auth-review.test'));
    await submit(); await verified;
    await expect(page).toHaveURL(/\/mijn-voordelen/);
    checks.push('Queued encrypted OTP verifies against real service and opens consumer destination at 390px');
    await logout();
    expect((await me()).status()).toBe(401);

    await page.goto(site + '/account?mode=login&next=%2Fwebshops');
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    await expect(page.locator('#name')).toHaveCount(0);
    await page.locator('#email').fill('consumer@auth-review.test');
    await page.locator('#password').fill('Auth-review-password-2026');
    const loggedIn = waitPost('/login', 200);
    await submit(); await loggedIn;
    await expect(page).toHaveURL(/\/webshops$/);
    checks.push('Explicit login mode and safe next destination work');

    // Force genuine Laravel token mismatches by changing only the outgoing token.
    let rejected = 0;
    await page.route(api + '/logout', route => {
      rejected++;
      return route.continue({ headers: { ...route.request().headers(), 'x-xsrf-token': 'invalid-fixture-token', 'sec-fetch-site': 'cross-site' } });
    });
    const dialog = page.waitForEvent('dialog');
    await page.locator('header').getByRole('button', { name: /menu/i }).first().click();
    await page.getByRole('button', { name: /log out|sign out|uitloggen/i }).last().click();
    await (await dialog).accept();
    expect(rejected).toBe(2);
    expect((await me()).status()).toBe(200);
    await page.unroute(api + '/logout');
    checks.push('Two genuine Laravel 419 logout responses preserve the authenticated server session and show recoverable error');
    await page.locator('header').getByRole('button', { name: /menu/i }).first().click();
    const loggedOut = waitPost('/logout', 204);
    await page.getByRole('button', { name: /log out|sign out|uitloggen/i }).last().click();
    await loggedOut;
    await expect(page).toHaveURL(/mode=login/);
    expect((await me()).status()).toBe(401);
    checks.push('Retrying logout succeeds and protected me returns 401');

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const factor of ['totp', 'recovery']) {
      await page.goto(site + '/account?mode=login');
      await expect(page.locator('form button[type=submit]')).toBeEnabled();
      await page.locator('#email').fill('mfa@auth-review.test');
      await page.locator('#password').fill('Auth-review-password-2026');
      await submit();
      await expect(page.locator('#totp')).toBeFocused();
      if (factor === 'recovery') {
        await page.getByRole('button', { name: /use.*recovery/i }).click();
        await expect(page.locator('#recovery')).toBeFocused();
        await page.locator('#recovery').fill('synthetic-recovery-code');
      } else {
        await page.locator('#totp').fill(probe('totp', 'mfa@auth-review.test'));
      }
      const challenged = waitPost('/two-factor-challenge', 200);
      await submit(); await challenged;
      await expect(page).toHaveURL(/\/mijn-voordelen/);
      expect((await me()).status()).toBe(200);
      if (factor === 'recovery') expect(probe('recovery-used', 'mfa@auth-review.test')).toBe('yes');
      checks.push(`Real Fortify ${factor} login, focus, authenticated me${factor === 'recovery' ? ' and recovery code consumption' : ''}`);
      await logout();
    }
    await page.goto(site + '/account?role=merchant');
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    await page.locator('#name').fill('Owner Review');
    await page.locator('#email').fill('owner@auth-review.test');
    await page.locator('#password').fill('Auth-review-password-2026');
    await page.locator('#consent').check();
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    const ownerRegistered = waitPost('/register', 201);
    await submit(); await ownerRegistered;
    await expect(page.locator('#verification')).toBeFocused();
    await page.locator('#verification').fill(probe('code', 'owner@auth-review.test'));
    const ownerVerified = waitPost('/api/v1/auth/email/verify-code', 200);
    await submit(); await ownerVerified;
    await expect(page).toHaveURL(/\/voor-webshops\/aanmelden/);
    const owner = (await (await me()).json()).data;
    expect(owner.role).toBe('merchant');
    expect(owner.workspaces).toEqual([]);
    checks.push('Merchant registration and OTP open webshop setup without granting membership');
    await logout();
    await page.goto(site + '/account?mode=login');
    await expect(page.locator('form button[type=submit]')).toBeEnabled();
    await page.screenshot({ path: 'docs/auth-login-desktop.png', fullPage: true });
    fs.writeFileSync('docs/auth-browser-review.json', JSON.stringify({ captured_at: new Date().toISOString(),
      environment: 'Local Chrome + Next dev + real Laravel HTTP + isolated SQLite; database queue and array mailer; token fault injection only for failed logout',
      checks, exchanges, limitations: ['No actual email delivery or Redis', 'No deployed cookie/CORS verification or staging P95', 'No approved visual references supplied'] }, null, 2) + '\n');
    console.log(`Auth browser review passed: ${checks.length} checks.`);
  } catch (error) {
    console.error('Completed checks:', checks);
    console.error('Recent exchanges:', exchanges.slice(-15));
    if (page) {
      console.error('Page:', await page.locator('body').innerText().catch(() => 'unavailable'));
      await page.screenshot({ path: 'docs/auth-browser-failure.png', fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
    else server.kill();
    fs.closeSync(log);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
