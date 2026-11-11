// Run through consumer-platform-local.php. Real HTTP, no page.route fixtures.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const api = process.env.CONSUMER_LOCAL_API;
const site = 'http://127.0.0.1:3340';
if (!api || new URL(api).hostname !== '127.0.0.1') throw new Error('Use the isolated PHP runner.');
const password = 'Local-only-2026!';
const email = 'consumer@platform-local.test';
const secrets = [password];
const selectedJourneys = process.env.CONSUMER_LOCAL_JOURNEYS?.split(',').map(Number) ?? null;
const reportPath = process.env.CONSUMER_LOCAL_REPORT || '../qa-evidence/consumer-platform-local-results.json';
const sanitize = text => secrets.reduce((out, secret) => out.split(secret).join('[redacted]'), String(text));
const probe = (action, ...args) => {
  const result = spawnSync(process.env.CONSUMER_LOCAL_PHP, ['-d', 'xdebug.mode=off', 'scripts/consumer-platform-local.php', 'probe', action, ...args], { cwd: process.cwd(), windowsHide: true, encoding: 'utf8', env: process.env });
  if (result.status !== 0) throw new Error(`Isolated fixture control failed: ${action}`);
  return result.stdout.trim();
};
const fixture = JSON.parse(probe('fixture'));
secrets.push(...Object.values(fixture.claims));
const offer = fixture.offers['Local points voucher'];
const headers = { Accept: 'application/json', Origin: site, Referer: site + '/', 'Accept-Language': 'nl' };
const report = {
  status: 'RUNNING',
  date: new Date().toISOString(), full_release_acceptance: false, environment: { api, frontend: site, database: 'isolated SQLite file', cache: 'database', queue: 'database (captured, no external delivery)', php: 'Xdebug disabled; bundled OPcache enabled for the isolated HTTP server when available', concurrency: 1 },
  response_interception: false, selected_journeys: selectedJourneys, synthetic_catalog_and_eligibility: true, journeys: [], http: [],
  limitations: ['Local results do not establish staging performance', 'Synthetic eligible orders and claim tokens; no external Answer24 handoff', 'Verification codes read from encrypted local notification jobs; no external mailbox delivery', 'Full accessibility and approved reference comparison remain unverified', 'No production provider or customer data'],
};
const run = async (id, name, fn) => {
  if (selectedJourneys && !selectedJourneys.includes(id)) return;
  const start = performance.now();
  try { const detail = await fn(); report.journeys.push({ id, name, result: 'PASS', duration_ms: Math.round(performance.now() - start), detail }); console.log(`PASS ${id}: ${name}`); }
  catch (error) { report.journeys.push({ id, name, result: 'FAIL', error: sanitize(error.message).slice(0, 1800) }); console.log(`FAIL ${id}: ${name} (${error.name})`); }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
};
async function call(context, method, pathname, data, extraHeaders = {}) {
  if (!(await context.cookies(api)).some(cookie => cookie.name === 'XSRF-TOKEN')) await context.request.get(api + '/sanctum/csrf-cookie', { headers });
  const xsrf = (await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const response = await context.request.fetch(api + pathname, { method, headers: { ...headers, ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf.value) } : {}), ...extraHeaders }, ...(data === undefined ? {} : { data }) });
  report.http.push({ method, path: pathname, status: response.status(), request_id_present: !!response.headers()['x-request-id'] });
  return response;
}
async function data(context, pathname) { const response = await call(context, 'GET', pathname); assert.equal(response.status(), 200, pathname); return (await response.json()).data; }
async function login(context, address) { assert.equal((await call(context, 'POST', '/login', { email: address, password })).status(), 200); }
const logPath = '../qa-evidence/consumer-platform-local-next.log';
const nextEnvBefore = fs.readFileSync('next-env.d.ts', 'utf8');
const log = fs.openSync(logPath, 'w');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3340'], {
  windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, SHOPBONUS_NEXT_DIST_DIR: '.next-consumer-local-turbo', NEXT_PUBLIC_API_BASE_URL: api, NEXT_PUBLIC_APP_URL: site, NEXT_PUBLIC_USE_COOKIE_AUTH: 'true', NEXT_PUBLIC_REVERB_APP_KEY: '' },
});
let browser;
(async () => {
  try {
    for (let attempt = 0; ; attempt++) {
      if (server.exitCode !== null || attempt > 90) throw new Error('Isolated Next server startup failed.');
      try { if ((await fetch(site + '/account', { signal: AbortSignal.timeout(45000) })).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => { localStorage.setItem('shopbonus-locale', 'nl'); localStorage.setItem('shopbonus-locale-explicit', '1'); });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const go = async url => {
      try {
        return await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      } catch (error) {
        if (!error.message.includes("net::ERR_ABORTED")) throw error;
        report.navigation_retries = (report.navigation_retries || 0) + 1;
        return page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      }
    };
    if (selectedJourneys && !selectedJourneys.includes(5)) {
      // Establish the same synthetic account, balances and two owned vouchers
      // through real HTTP when rerunning only profile/operational scenarios.
      assert.equal((await call(context, 'POST', '/register', { account_type: 'consumer', first_name: 'Local Consumer', email, password, password_confirmation: password, accept_terms: true, terms_version: 'consumer-local-terms', privacy_version: 'consumer-local-privacy', locale: 'nl' })).status(), 201);
      const code = probe('code', email); if (!/^\d{6}$/.test(code)) throw new Error('Local queued-code probe returned invalid data'); secrets.push(code);
      assert.equal((await call(context, 'POST', '/api/v1/auth/email/verify-code', { code })).status(), 200);
      probe('fund');
      assert.equal((await call(context, 'POST', '/api/v1/consumer/activation/complete', { token: fixture.claims.valid })).status(), 200);
      if (!selectedJourneys.includes(8)) assert.equal((await call(context, 'POST', '/api/v1/consumer/checkouts', { offer, wallet_unit: 'points', use_wallet: true }, { 'Idempotency-Key': 'consumer-local-targeted-checkout' })).status(), 201);
    }
    await run(1, 'Homepage, published CMS, locale, cookies and responsive navigation', async () => {
      await go(site);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lokale consumentenacceptatie');
      await expect(page.getByTestId('cookie-reject')).toBeVisible();
      await page.getByTestId('cookie-reject').click();
      await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);
      const id = await page.evaluate(() => localStorage.getItem('shopbonus-cookie-consent-id'));
      const consent = await data(context, '/api/v1/public/cookie-consents/' + id);
      assert.equal(consent.choices.analytics, false); assert.equal(consent.choices.marketing, false);
      await page.getByRole('button', { name: 'en', exact: true }).first().click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Local consumer acceptance');
      await page.getByRole('button', { name: 'nl', exact: true }).first().click();
      await page.screenshot({ path: 'docs/consumer-platform-local-home-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: 'docs/consumer-platform-local-home-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      return 'Published NL/EN CMS and persisted reject-optional consent; desktop/mobile navigation rendered.';
    });
    await run(2, 'Discovery search, category, sort, pagination and public-only projection', async () => {
      const first = await call(context, 'GET', '/api/v1/public/webshops?per_page=12&sort=name');
      const json = await first.json(); assert.equal(first.status(), 200); assert.equal(json.data.length, 12); assert(json.meta.total >= 200);
      const second = await data(context, '/api/v1/public/webshops?per_page=12&page=2&sort=name');
      assert(!second.some(row => row.slug === json.data[0].slug));
      const filtered = await data(context, '/api/v1/public/webshops?search=Consumer%20Local&category=home_living&has_offers=1&sort=name');
      assert.deepEqual(filtered.map(row => row.slug), ['consumer-local-shop']);
      assert(!JSON.stringify(filtered).includes('created_by'));
      await go(site + '/webshops');
      await page.getByRole('textbox', { name: 'Zoek een webshop' }).fill('Consumer Local');
      await expect(page.getByRole('heading', { name: 'Consumer Local Shop', exact: true })).toBeVisible();
      return { catalog_total: json.meta.total, page_size: 12, clean_slug: true };
    });
    await run(3, 'Webshop details expose approved public fields only', async () => {
      const detail = await data(context, '/api/v1/public/webshops/consumer-local-shop');
      assert.equal(detail.name, 'Consumer Local Shop');
      for (const field of ['created_by', 'owner', 'integrations', 'orders', 'agreement', 'memberships']) assert(!(field in detail));
      await go(site + '/webshops/consumer-local-shop');
      await expect(page.getByRole('heading', { level: 1, name: 'Consumer Local Shop', exact: true })).toBeVisible();
      return 'Clean-slug public detail rendered; private fields absent from API projection.';
    });
    await run(4, 'Offer points price and paused/expired/sold-out protection', async () => {
      const active = await data(context, '/api/v1/public/offers/' + offer);
      assert.equal(active.price_points, 250); assert.equal(active.price_minor, null);
      for (const [title, state] of [['Local paused voucher', 'paused'], ['Local expired voucher', 'expired'], ['Local sold out voucher', 'sold_out']]) {
        const response = await call(context, 'GET', '/api/v1/public/offers/' + fixture.offers[title]);
        assert([200, 404].includes(response.status()));
        if (response.status() === 200) assert.equal((await response.json()).data.availability, state);
      }
      assert.equal(JSON.parse(probe('evidence')).checkouts, 0);
      await go(site + '/aanbiedingen/' + offer);
      await expect(page.getByText('250 punten', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Inloggen om te verkrijgen', exact: true }).click();
      await expect(page).toHaveURL(/\/account\?.*next=/);
      return 'No checkout from viewing; 250 integer points, safe anonymous destination, unavailable offer states.';
    });
    await run(5, 'Real registration, queued OTP and intended-offer return', async () => {
      await go(site + '/account?role=consumer&next=' + encodeURIComponent('/aanbiedingen/' + offer));
      await expect(page.locator('form button[type=submit]')).toBeEnabled();
      await page.locator('#name').fill('Local Consumer');
      await page.locator('#email').fill(email);
      await page.locator('#password').fill(password);
      await page.locator('#consent').check();
      await page.locator('form button[type=submit]').click();
      await expect(page.locator('#verification')).toBeVisible();
      const code = probe('code', email); if (!/^\d{6}$/.test(code)) throw new Error('Local queued-code probe returned invalid data'); secrets.push(code);
      await page.locator('#verification').fill(code);
      await page.locator('form button[type=submit]').click();
      await expect(page).toHaveURL(site + '/aanbiedingen/' + offer);
      assert.equal((await data(context, '/api/v1/me')).email_verified, true);
      assert.equal((await call(context, 'POST', '/api/v1/auth/email/verify-code', { code })).status(), 409);
      probe('fund');
      return 'Real UI registration/session/CSRF and OTP validation; code captured from encrypted local queue, not external email delivery.';
    });
    await run(6, 'Activation invitation preview and exactly-once account association', async () => {
      const before = JSON.parse(probe('evidence')).claimed_invitations;
      await go(site + '/claim/' + fixture.claims.valid);
      await expect(page.getByRole('heading', { name: 'Activeer je ShopBonus-beloning' })).toBeVisible();
      assert.equal(JSON.parse(probe('evidence')).claimed_invitations, before);
      await page.getByRole('button', { name: 'Activeer beloning', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Beloning geactiveerd', exact: true })).toBeVisible();
      const replay = await call(context, 'POST', '/api/v1/consumer/activation/complete', { token: fixture.claims.valid });
      assert.equal(replay.status(), 200);
      assert.equal(JSON.parse(probe('evidence')).claimed_invitations, before + 1);
      return 'Browser activation and HTTP retry associate one voucher. Synthetic eligible order, no external Answer24 proof.';
    });
    await run(7, 'Expired, revoked, forged, mismatched and cross-account replay protection', async () => {
      for (const [kind, status] of [['expired', 410], ['revoked', 410], ['forged', 404]]) {
        const response = await call(context, 'POST', '/api/v1/consumer/activation/verify', { token: fixture.claims[kind] || 'x'.repeat(24) });
        assert.equal(response.status(), status);
        assert(!(await response.text()).includes('@platform-local.test'));
      }
      assert.equal((await call(context, 'POST', '/api/v1/consumer/activation/complete', { token: fixture.claims.mismatch })).status(), 403);
      const other = await browser.newContext(); await login(other, 'other@platform-local.test');
      assert.equal((await call(other, 'POST', '/api/v1/consumer/activation/complete', { token: fixture.claims.valid })).status(), 410);
      assert(JSON.parse(probe('evidence')).denied_audits > 0);
      await other.close();
      return 'Real 404/410/403 responses; denial audit exists; recipient data absent from failures.';
    });
    await run(8, 'One EUR wallet page, legacy points isolation and actual voucher checkout', async () => {
      const initial = await data(context, '/api/v1/me/wallet');
      assert.equal(initial.balances.points.available, 300); assert.equal(initial.balances.points.pending, 1000); assert.equal(initial.balances.points.reserved, 100);
      await go(site + '/afrekenen/' + fixture.offers['Local expensive voucher']);
      await expect(page.getByText('Je hebt onvoldoende beschikbare punten voor deze voucher.', { exact: true })).toBeVisible();
      await page.getByRole('checkbox').check();
      await expect(page.getByRole('button', { name: 'Voucher ophalen', exact: true })).toBeDisabled();
      await go(site + '/afrekenen/' + offer);
      await expect(page.getByText('250 punten', { exact: true }).first()).toBeVisible();
      const before = JSON.parse(probe('evidence')).checkouts;
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Voucher ophalen', exact: true }).click();
      await expect(page).toHaveURL(/\/mijn-voordelen\?voucher=/);
      const wallet = await data(context, '/api/v1/me/wallet');
      assert.equal(wallet.balances.points.available, 50); assert.equal(wallet.available_minor, initial.available_minor);
      assert.equal(wallet.balances.points.pending, 1000); assert.equal(wallet.balances.points.reserved, 100);
      const proof = JSON.parse(probe('evidence')); assert.equal(proof.checkouts, before + 1); assert.equal(proof.points_debits, 1);
      await go(site + '/mijn-voordelen');
      const walletCard = page.getByRole('region', { name: 'Mijn ShopBonus-tegoed', exact: true });
      await expect(walletCard.getByText(/€\s?12,34/)).toHaveCount(1);
      await expect(page.getByRole('region', { name: 'Mijn punten', exact: true })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Recente activiteit', exact: true })).toHaveCount(0);
      const navigation = page.getByRole('navigation', { name: 'Mijn voordelen secties' });
      await expect(navigation.getByRole('link')).toHaveCount(3);
      await navigation.getByRole('link', { name: 'Tegoedtransacties' }).click();
      await expect(page).toHaveURL(/\/transacties$/);
      await expect(page.getByText('Tegoed na transactie', { exact: false })).toHaveCount(1);
      await expect(page.getByText(/− 250 punten/)).toHaveCount(0);
      await navigation.getByRole('link', { name: 'Mijn aankopen' }).click();
      await expect(page).toHaveURL(/\/aankopen$/);
      await page.reload();
      await expect(navigation.getByRole('link', { name: 'Mijn aankopen' })).toHaveAttribute('aria-current', 'page');
      await page.goBack();
      await expect(navigation.getByRole('link', { name: 'Tegoedtransacties' })).toHaveAttribute('aria-current', 'page');
      const posted = await data(context, '/api/v1/consumer/wallet/transactions?filter=posted&unit=eur_credit');
      assert.deepEqual(posted.map(row => [row.unit, row.available_after]), [['eur_credit', 1234]]);
      await page.getByTestId('cookie-reject').click();
      await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);
      await expect(page.getByText('Tegoed na transactie', { exact: false })).toBeVisible();
      await expect(walletCard).toHaveAttribute('aria-busy', 'false');
      await expect(walletCard.getByText(/€\s?12,34/)).toBeVisible();
      await page.screenshot({ path: '../qa-evidence/consumer-platform-local-dashboard-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await expect(page.getByText('Tegoed na transactie', { exact: false })).toBeVisible();
      await expect(walletCard).toHaveAttribute('aria-busy', 'false');
      await page.screenshot({ path: '../qa-evidence/consumer-platform-local-dashboard-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      const other = await browser.newContext(); await login(other, 'other@platform-local.test');
      const foreign = await data(other, '/api/v1/consumer/dashboard'); assert.equal(foreign.wallet.points.available, 0); assert.equal(foreign.vouchers.issued, 0);
      const ledger = await data(context, '/api/v1/consumer/wallet/transactions?unit=points');
      assert.equal((await call(other, 'GET', '/api/v1/consumer/wallet/transactions/' + ledger[0].id)).status(), 404);
      await other.close();
      return { available_points: 50, pending_points: 1000, reserved_points: 100, eur_unchanged: true, points_debits: 1 };
    });
    await run(9, 'Profile persistence, language, consent and email re-verification', async () => {
      await go(site + '/profiel');
      await expect(page.getByLabel('Voornaam', { exact: true })).toBeVisible();
      await page.getByLabel('Voornaam', { exact: true }).fill('Updated Consumer');
      await page.getByRole('button', { name: 'Wijzigingen opslaan', exact: true }).click();
      await expect(page.getByText('Je profiel is bijgewerkt.', { exact: true })).toBeVisible();
      await page.reload(); await expect(page.getByLabel('Voornaam', { exact: true })).toHaveValue('Updated Consumer');
      assert.equal((await call(context, 'PATCH', '/api/v1/consumer/profile', { locale: 'en' })).status(), 200);
      assert.equal((await data(context, '/api/v1/consumer/profile')).locale, 'en');
      assert.equal((await call(context, 'PUT', '/api/v1/consumer/preferences', { notifications: { vouchers_discounts: false, reminders: false, offers_inspiration: false } })).status(), 200);
      assert.equal((await data(context, '/api/v1/consumer/preferences')).notifications.offers_inspiration, false);
      const newEmail = 'changed@platform-local.test';
      assert.equal((await call(context, 'POST', '/api/v1/consumer/email-change', { email: newEmail, current_password: password })).status(), 202);
      const code = probe('code', newEmail); if (!/^\d{6}$/.test(code)) throw new Error('Local queued-code probe returned invalid data'); secrets.push(code);
      assert.equal((await data(context, '/api/v1/consumer/profile')).email, email);
      assert.equal((await call(context, 'POST', '/api/v1/consumer/email-change/confirm', { code: code === '000000' ? '111111' : '000000' })).status(), 422);
      assert.equal((await call(context, 'POST', '/api/v1/consumer/email-change/confirm', { code })).status(), 200);
      assert.equal((await data(context, '/api/v1/consumer/profile')).email, newEmail);
      assert.equal((await call(context, 'POST', '/api/v1/consumer/email-change/confirm', { code })).status(), 409);
      await call(context, 'POST', '/logout'); await login(context, newEmail);
      return 'UI name persisted; API language/preferences persisted; new email requires correct single-use queued code and new-address login.';
    });
    await run(10, 'Local operational checks and real HTTP P95', async () => {
      const anonymous = await browser.newContext();
      assert.equal((await call(anonymous, 'GET', '/api/v1/consumer/dashboard')).status(), 401);
      assert.equal((await call(context, 'PATCH', '/api/v1/consumer/profile', { first_name: '123' })).status(), 422);
      const noCsrf = await call(context, 'PATCH', '/api/v1/consumer/profile', { first_name: 'Forbidden' }, { 'X-XSRF-TOKEN': 'invalid-local-token', 'sec-fetch-site': 'cross-site' });
      assert.equal(noCsrf.status(), 419);
      const old = await data(context, '/api/v1/public/webshops/consumer-local-shop');
      probe('pause');
      const changed = await data(context, '/api/v1/public/webshops/consumer-local-shop');
      assert(changed.offers.length < old.offers.length);
      probe('wallet-down');
      try { assert.equal((await call(context, 'GET', '/api/v1/me/wallet')).status(), 500); } finally { probe('wallet-up'); }
      assert.equal((await data(context, '/api/v1/me/wallet')).balances.points.available, 50);
      // Trigger the genuine claims limiter on a fresh local request stream.
      let limited = false;
      for (let i = 0; i < 12; i++) { const r = await call(anonymous, 'POST', '/api/v1/consumer/activation/verify', { token: 'z'.repeat(24) }); if (r.status() === 429) { limited = true; break; } }
      assert(limited);
      // Keep browser polling/render work out of the sequential API measurement.
      await page.close();
      const paths = ['/api/v1/public/webshops?search=Benchmark&sort=most_offers&per_page=12', '/api/v1/public/webshops?search=Local&category=home_living&has_offers=1&sort=most_offers&per_page=12', '/api/v1/public/webshops?search=Shop%201&sort=name&per_page=12', '/api/v1/public/webshops?search=no-match&sort=name&per_page=12'];
      report.performance = { methodology: 'Real loopback HTTP including bootstrap/network/SQL, sequential, Xdebug disabled; cache invalidation control outside timed sample', paths, results: {} };
      for (const mode of ['directory_cold', 'directory_warm', 'dashboard']) {
        const samples = [];
        for (let i = 0; i < 100; i++) {
          if (mode === 'directory_cold') probe('cache-clear');
          const pathname = mode === 'dashboard' ? '/api/v1/consumer/dashboard' : paths[i % paths.length];
          const start = performance.now(); const response = await call(context, 'GET', pathname); await response.body();
          samples.push(performance.now() - start); assert.equal(response.status(), 200, mode);
        }
        const sorted = [...samples].sort((a, b) => a - b);
        report.performance.results[mode] = { samples_ms: samples.map(n => +n.toFixed(2)), count: 100, p50_ms: +sorted[49].toFixed(2), p95_ms: +sorted[94].toFixed(2), max_ms: +sorted[99].toFixed(2), target_300ms_met_locally: sorted[94] < 300 };
        console.log(`${mode} P95: ${sorted[94].toFixed(2)} ms (local)`);
      }
      await anonymous.close();
      return 'Real 401/403/404/419/422/429/500 handling and local cache invalidation exercised. Accessibility, security scans and staging remain separate.';
    });
    await run(11, 'Registration reports all password and terms errors together for both roles in NL/EN/DE', async () => {
      const languages = {
        nl: { length: /minimaal 10 tekens/, letter: /minimaal één letter/, terms: /Accepteer de voorwaarden/, weak: 'Zwak', card: 'Meer voordeel.' },
        en: { length: /at least 10 characters/, letter: /at least one letter/, terms: /Accept the Terms/, weak: 'Weak', card: 'More benefits.' },
        de: { length: /mindestens 10 Zeichen/, letter: /mindestens einen Buchstaben/, terms: /Akzeptiere die Nutzungsbedingungen/, weak: 'Schwach', card: 'Mehr Vorteile.' },
      };
      const cases = [];
      for (const [locale, expected] of Object.entries(languages)) {
        probe('registration-throttle-clear'); // Each locale is an independent registration case.
        for (const role of ['consumer', 'merchant']) {
          const signup = await browser.newContext({ viewport: { width: 390, height: 844 } });
          try {
            await signup.addInitScript(language => {
              localStorage.setItem('shopbonus-locale', language);
              localStorage.setItem('shopbonus-locale-explicit', '1');
            }, locale);
            const screen = await signup.newPage();
            await screen.goto(site + '/account?role=' + role, { waitUntil: 'domcontentloaded' });
            await expect(screen.locator('html')).toHaveAttribute('lang', locale);
            await screen.getByTestId('cookie-reject').click();
            await expect(screen.locator('form button[type=submit]')).toBeEnabled();
            await expect(screen.getByText(expected.card, { exact: true })).toBeVisible();
            await screen.locator('#name').fill('Local QA');
            await expect(screen.locator('#name')).toHaveValue('Local QA');
            await screen.locator('#email').fill(role + '-' + locale + '@registration.test');
            await expect(screen.locator('#email')).toHaveValue(role + '-' + locale + '@registration.test');
            await screen.locator('#password').fill('Password123!');
            await expect(screen.locator('#password-requirements').getByText(expected.weak, { exact: true })).toBeVisible();
            await screen.locator('#password').fill('123');
            await expect(screen.locator('#password')).toHaveValue('123');
            await expect(screen.locator('#password-requirements').getByText(expected.weak, { exact: true })).toBeVisible();
            for (const checkbox of await screen.locator('form input[type=checkbox]').all()) await expect(checkbox).not.toBeChecked();
            const response = screen.waitForResponse(res => new URL(res.url()).pathname === '/register' && res.request().method() === 'POST');
            await screen.locator('form button[type=submit]').click();
            const rejection = await response;
            assert.equal(rejection.status(), 422);
            assert.equal(rejection.headers()['content-language'], locale);
            const { error } = await rejection.json();
            assert.equal(error.code, 'validation_failed');
            assert.equal(error.request_id, rejection.headers()['x-request-id']);
            assert.equal(error.fields.password.length, 2);
            assert(error.fields.password.some(message => expected.length.test(message)));
            assert(error.fields.password.some(message => expected.letter.test(message)));
            assert(expected.terms.test(error.fields.accept_terms[0]));
            for (const message of [...error.fields.password, ...error.fields.accept_terms]) {
              await expect(screen.getByText(message, { exact: true })).toHaveCount(1);
            }
            await expect(screen.locator('#password')).toBeFocused();
            await expect(screen.locator('#name')).toHaveValue('Local QA');
            await expect(screen.locator('form [role=alert]')).toHaveCount(2);
            if (locale === 'nl' && role === 'consumer') {
              await screen.screenshot({ path: '../qa-evidence/final-integration-registration-nl-mobile.png', fullPage: true });
            }
            cases.push({ role, locale, status: 422, request_id: error.request_id, fields: error.fields });
          } catch (error) {
            const failurePage = signup.pages()[0];
            if (failurePage) await failurePage.screenshot({ path: '../qa-evidence/final-integration-registration-failure-' + locale + '-' + role + '.png', fullPage: true });
            throw new Error(locale + '/' + role + ': ' + error.message);
          } finally { await signup.close(); }
        }
      }
      return { cases };
    });
    await run(12, 'Responsive empty wallet and three translated links in NL/EN/DE', async () => {
      const labels = {
        nl: ['Mijn ShopBonus-tegoed', 'Ontdek webshops', 'Mijn vouchers', 'Tegoedtransacties', 'Mijn aankopen'],
        en: ['My ShopBonus credit', 'Discover shops', 'My vouchers', 'Credit transactions', 'My purchases'],
        de: ['Mein ShopBonus-Guthaben', 'Shops entdecken', 'Meine Gutscheine', 'Guthabenbuchungen', 'Meine Einkäufe'],
      };
      for (const [locale, names] of Object.entries(labels)) {
        const empty = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        try {
          await empty.addInitScript(language => { localStorage.setItem('shopbonus-locale', language); localStorage.setItem('shopbonus-locale-explicit', '1'); }, locale);
          await login(empty, 'other@platform-local.test');
          const screen = await empty.newPage();
          await screen.goto(site + '/mijn-voordelen', { waitUntil: 'domcontentloaded' });
          await expect(screen.locator('html')).toHaveAttribute('lang', locale);
          await screen.getByTestId('cookie-reject').click();
          await expect(screen.getByTestId('cookie-consent-banner')).toHaveCount(0);
          const wallet = screen.getByRole('region', { name: names[0], exact: true });
          await expect(wallet).toHaveAttribute('aria-busy', 'false');
          await expect(wallet.getByText(locale === 'en' ? /€0.00/ : /0,00/)).toHaveCount(1);
          await expect(screen.getByRole('link', { name: names[1], exact: true })).toHaveCount(1);
          for (const name of names.slice(2)) await expect(screen.getByRole('link', { name, exact: true })).toBeVisible();
          await screen.getByTestId('header-profile').click();
          await expect(screen.locator('header').getByRole('link', { name: names[3], exact: true })).toHaveAttribute('href', '/transacties');
          const closeAccount = { nl: 'Accountmenu sluiten', en: 'Close account menu', de: 'Kontomenü schließen' };
          await screen.getByRole('button', { name: closeAccount[locale], exact: true }).click();
          await expect(screen.getByRole('heading', { name: locale === 'nl' ? 'Nog geen vouchers hier' : locale === 'en' ? 'No vouchers here yet' : 'Hier gibt es noch keine Gutscheine', exact: true })).toBeVisible();
          const heroTitle = await screen.getByRole('heading', { level: 1 }).boundingBox();
          const card = await wallet.boundingBox();
          assert(Math.abs(card.y - heroTitle.y) < 80);
          if (locale === 'nl') await screen.screenshot({ path: '../qa-evidence/final-integration-empty-desktop.png', fullPage: true });
          await screen.setViewportSize({ width: 390, height: 844 });
          await screen.bringToFront();
          await expect(wallet).toHaveAttribute('aria-busy', 'false');
          await expect(screen.getByRole('link', { name: names[1], exact: true })).toBeVisible();
          await expect(screen.getByRole('heading', { name: locale === 'nl' ? 'Nog geen vouchers hier' : locale === 'en' ? 'No vouchers here yet' : 'Hier gibt es noch keine Gutscheine', exact: true })).toBeVisible();
          assert(await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          if (locale === 'nl') await screen.screenshot({ path: '../qa-evidence/final-integration-empty-mobile.png', fullPage: true });
        } finally { await empty.close(); }
      }
      return { locales: Object.keys(labels), viewports: ['1440x1000', '390x844'] };
    });
    await run(13, 'Protected discovery, login return and legacy benefits routes', async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await visitor.addInitScript(() => { localStorage.setItem('shopbonus-locale', 'nl'); localStorage.setItem('shopbonus-locale-explicit', '1'); });
      try {
        const guest = await visitor.newPage();
        await guest.goto(site + '/contact');
        await expect(guest.locator('header a[href="/webshops"], header a[href="/kortingscodes"]')).toHaveCount(0);
        for (const target of ['/webshops?q=consumer', '/kortingscodes']) {
          await guest.goto(site + target);
          await expect(guest).toHaveURL(`${site}/inloggen?next=${encodeURIComponent(target)}`);
        }
        assert.equal((await call(visitor, 'GET', '/api/v1/public/webshops')).status(), 401);
        assert.equal((await call(visitor, 'GET', '/api/v1/public/discount-codes')).status(), 401);
        const reject = guest.getByTestId('cookie-reject');
        if (await reject.isVisible()) await reject.click();
        await guest.locator('#email').fill(email);
        await guest.locator('#password').fill(password);
        await guest.locator('form button[type="submit"]').click();
        await expect(guest).toHaveURL(site + '/kortingscodes');
        await expect(guest.locator('header a[href="/kortingscodes"]').first()).toBeAttached();
        await guest.goto(site + '/mijn-voordelen?tab=transacties&source=legacy');
        await expect(guest).toHaveURL(site + '/transacties?source=legacy');
        await guest.reload();
        await expect(guest.locator('a[href="/transacties"][aria-current="page"]')).toBeVisible();
        await guest.getByRole('link', { name: 'Mijn aankopen', exact: true }).click();
        await expect(guest).toHaveURL(site + '/aankopen');
        await guest.goBack();
        await expect(guest).toHaveURL(site + '/transacties?source=legacy');
        await guest.goForward();
        await expect(guest).toHaveURL(site + '/aankopen');
        await guest.goto(site + '/vouchers');
        await expect(guest.locator('a[href="/vouchers"][aria-current="page"]')).toBeVisible();
        return { guest_api_status: 401, login_return: '/kortingscodes', verified_routes: ['/vouchers', '/transacties', '/aankopen'] };
      } finally { await visitor.close(); }
    });
    await run(14, 'Notification profile and welcome links, mark read, and mobile inbox', async () => {
      probe('dispatch-notifications');
      if ((await call(context, 'GET', '/api/v1/me')).status() === 401) await login(context, email);
      await page.setViewportSize({ width: 390, height: 844 });
      await go(site + '/mijn-voordelen');
      const reject = page.getByTestId('cookie-reject');
      if (await reject.isVisible()) await reject.click();
      const bell = page.getByTestId('notification-bell-button');
      await bell.click();
      const verified = page.getByTestId('notification-item').filter({ hasText: 'E-mailadres bevestigd' });
      const welcome = page.getByTestId('notification-item').filter({ hasText: 'Welkom bij ShopBonus' });
      await expect(verified).toHaveAttribute('href', '/profiel');
      await expect(welcome).toHaveAttribute('href', '/mijn-voordelen');
      const panel = page.getByTestId('notification-dropdown');
      const bounds = await panel.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390);
      await panel.screenshot({ path: '../qa-evidence/final-followup-notification-mobile.png' });
      const read = page.waitForResponse(r => /\/api\/v1\/notifications\/[^/]+\/read$/.test(r.url()) && r.request().method() === 'PATCH');
      await verified.click();
      assert.equal((await read).status(), 200);
      await expect(page).toHaveURL(site + '/profiel');
      await bell.click();
      await page.getByTestId('notification-view-all').click();
      await expect(page).toHaveURL(site + '/meldingen');
      await expect(page.getByTestId('notification-center')).toBeVisible();
      const second = await browser.newContext();
      try {
        await login(second, email);
        const otherDevice = await second.newPage();
        await otherDevice.goto(site + '/meldingen');
        await expect(otherDevice.getByTestId('notification-unread-badge')).toBeVisible();
        await page.getByTestId('notification-center-mark-all').click();
        await expect(page.getByTestId('notification-unread-badge')).toHaveCount(0);
        await otherDevice.bringToFront();
        await expect(otherDevice.getByTestId('notification-unread-badge')).toHaveCount(0);
      } finally { await second.close(); }
      const inbox = await call(context, 'GET', '/api/v1/notifications?filter=unread&per_page=1');
      assert.equal((await inbox.json()).meta.unread_count, 0);
      return { destination: '/profiel', welcome: '/mijn-voordelen', inbox: '/meldingen', unread: 0, viewport: '390x844', second_authenticated_browser_synced: true };
    });
    await run(15, 'Canonical contact page and localized real form validation', async () => {
      const results = [];
      for (const [locale, label] of Object.entries({ nl: 'Verstuur bericht', en: 'Send message', de: 'Nachricht senden' })) {
        const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await visitor.addInitScript(language => { localStorage.setItem('shopbonus-locale', language); localStorage.setItem('shopbonus-locale-explicit', '1'); }, locale);
        try {
          const contact = await visitor.newPage();
          await contact.goto(site + '/over-ons#contact');
          await expect(contact).toHaveURL(site + '/contact');
          const reject = contact.getByTestId('cookie-reject');
          if (await reject.isVisible()) await reject.click();
          const submit = contact.getByRole('button', { name: label, exact: true });
          const validation = contact.waitForResponse(r => r.url().endsWith('/api/v1/public/contact') && r.request().method() === 'POST');
          await submit.click();
          assert.equal((await validation).status(), 422);
          await expect(contact.locator('form [aria-invalid="true"]')).toHaveCount(5);
          await expect(contact.locator('#contact-name')).toBeFocused();
          results.push({ locale, field_errors: 5 });
          if (locale === 'de') {
            await contact.locator('#contact-name').fill('Synthetischer Kontakt');
            await contact.locator('#contact-email').fill('contact@platform-local.test');
            await contact.locator('#contact-subject').fill('Testanfrage');
            await contact.locator('#contact-message').fill('Synthetische Nachricht für den lokalen Test.');
            await contact.locator('[name="privacy"]').check();
            const accepted = contact.waitForResponse(r => r.url().endsWith('/api/v1/public/contact') && r.request().method() === 'POST');
            await submit.click();
            assert.equal((await accepted).status(), 202);
            await expect(contact.getByText('Deine Nachricht ist eingegangen.', { exact: false })).toBeFocused();
            await contact.screenshot({ path: '../qa-evidence/final-followup-contact-mobile.png', fullPage: true });
          }
        } finally { await visitor.close(); }
      }
      return { validation: results, accepted_status: 202, transport: 'queued; not external delivery' };
    });
    report.database_evidence = JSON.parse(probe('evidence'));
    const operational = report.journeys.find(row => row.id === 10);
    if (operational?.result === 'PASS') {
      operational.result = 'PARTIAL';
      operational.local_checks_passed = true;
      operational.remaining = ['Full accessibility review', 'Approved desktop/mobile reference comparison', 'Staging evidence', 'Fresh npm advisory audit requires separate permission'];
    }
    report.status = report.journeys.some(row => row.result === 'FAIL') ? 'LOCAL CHECKS FAILED; RELEASE PARTIAL' : 'LOCAL SCENARIOS RECORDED; RELEASE PARTIAL';
    await context.close();
  } catch (error) { report.status = 'HARNESS FAILED'; report.error = sanitize(error.message).slice(0, 1800); process.exitCode = 1; }
  finally {
    await browser?.close();
    if (process.platform === 'win32' && server.pid) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else server.kill();
    fs.closeSync(log);
    if (fs.existsSync(logPath)) fs.writeFileSync(logPath, sanitize(fs.readFileSync(logPath, 'utf8')));
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    tsconfig.include = tsconfig.include.filter(entry => !entry.startsWith('.next-consumer-local/') && !entry.startsWith('.next-consumer-local-turbo/'));
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
    if (fs.readFileSync('next-env.d.ts', 'utf8').includes('.next-consumer-local-turbo/')) fs.writeFileSync('next-env.d.ts', nextEnvBefore);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    if (report.journeys.some(row => row.result === 'FAIL')) process.exitCode = 1;
    console.log(report.status);
    process.exit(process.exitCode || 0);
  }
})();
