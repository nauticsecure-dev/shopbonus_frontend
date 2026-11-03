// Local demo smoke checks against the services configured in .env.local.
// No API interception; this is partial evidence, not all ten release journeys.
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const fs = require('node:fs');
require('dotenv').config({ path: '.env.local', quiet: true });
const api = process.env.NEXT_PUBLIC_API_BASE_URL;
const site = process.env.NEXT_PUBLIC_APP_URL;
for (const url of [api, site]) {
  if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error('This script uses seeded demo credentials and requires local frontend/API URLs.');
  }
}
const checks = [];
let browser, context, original, csrf, authenticated = false;
const headers = { Accept: 'application/json', Origin: site, Referer: site + '/' };
const profileUrl = api + '/api/v1/consumer/profile';
const result = { date: '2026-11-03', environment: { site, api }, interception: false, checks,
  limits: ['Local seeded consumer only', 'No mail transport: env uses log mailer and disables notification email',
    'No approved visual reference comparison', 'Not the complete ten real-service journeys'] };
(async () => {
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    context = await browser.newContext();
    const response = await context.request.get(api + '/sanctum/csrf-cookie', { headers, timeout: 15000 });
    expect(response.status()).toBe(204);
    const token = (await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN');
    expect(token).toBeTruthy();
    csrf = { ...headers, 'X-XSRF-TOKEN': decodeURIComponent(token.value) };
    const login = await context.request.post(api + '/login', { headers: csrf,
      data: { email: 'consumer@shopbonus.local', password: 'ShopBonus-Local-2026!' }, timeout: 15000 });
    expect(login.status()).toBe(200);
    authenticated = true;
    csrf = { ...headers, 'X-XSRF-TOKEN': decodeURIComponent((await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN').value) };
    checks.push('Real local CSRF and seeded consumer login');
    const loaded = await context.request.get(profileUrl, { headers });
    expect(loaded.status()).toBe(200);
    original = (await loaded.json()).data;
    expect(original.security.email_verified).toBe(true);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.addInitScript(() => {
      localStorage.setItem('shopbonus-locale', 'nl');
      localStorage.setItem('shopbonus-locale-explicit', '1');
    });
    await page.goto(site + '/profiel');
    await expect(page.getByLabel('Voornaam', { exact: true })).toHaveValue(original.first_name);
    await expect(page.getByLabel('E-mailadres', { exact: true })).toHaveValue(original.email);
    await expect(page.getByTestId('header-profile')).toBeVisible();
    checks.push('Authenticated profile loads persisted first name/email and header');
    await page.getByLabel('Voornaam', { exact: true }).fill('Profile Review');
    await page.getByRole('button', { name: 'Wijzigingen opslaan', exact: true }).click();
    await expect(page.getByText('Je profiel is bijgewerkt.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Voornaam', { exact: true })).toHaveValue('Profile Review');
    const saved = await context.request.get(profileUrl, { headers });
    expect((await saved.json()).data.first_name).toBe('Profile Review');
    checks.push('Browser save persists through reload and independent API read');
    await page.getByLabel('Voornaam', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Wijzigingen opslaan', exact: true }).click();
    await expect(page.getByText('Gebruik alleen letters, spaties, apostroffen of koppeltekens.').first()).toBeVisible();
    const unchanged = await context.request.get(profileUrl, { headers });
    expect((await unchanged.json()).data.first_name).toBe('Profile Review');
    checks.push('Invalid name leaves persisted name unchanged');
    result.status = 'PARTIAL PASS';
  } catch (error) {
    result.status = 'FAILED';
    // Assertion messages contain status/expectations only; never record HTTP bodies.
    result.error = error.message;
    process.exitCode = 1;
  } finally {
    try {
      if (original) {
        csrf = { ...headers, 'X-XSRF-TOKEN': decodeURIComponent((await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN').value) };
        const restored = await context.request.patch(profileUrl, { headers: csrf, data: { first_name: original.first_name } });
        expect(restored.status()).toBe(200);
        const verified = await context.request.get(profileUrl, { headers });
        expect((await verified.json()).data.first_name).toBe(original.first_name);
        checks.push('Original demo name restored and verified');
      }
      if (authenticated) expect((await context.request.post(api + '/logout', { headers: csrf })).status()).toBe(204);
    } catch {
      result.status = 'FAILED';
      result.cleanup_error = 'Demo profile restoration or logout failed; inspect the local test account.';
      process.exitCode = 1;
    }
    await browser?.close();
    fs.writeFileSync('docs/consumer-profile-live-results.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  }
})();
