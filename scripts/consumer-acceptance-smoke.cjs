// Real local UI/API/queued SMTP. No intercepted responses or token artifacts.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const site = 'http://localhost:3038', api = 'http://localhost:8038', mailbox = 'http://127.0.0.1:8039';
const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, '.consumer-acceptance/fixtures.json')));
const checks = [];
let browser, step = 'launch';
async function main() {
  browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let context = await browser.newContext();
  let page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => { localStorage.setItem('shopbonus-locale', 'en'); localStorage.setItem('shopbonus-locale-explicit', '1'); });
  step = 'consumer registration';
  const email = `acceptance-${randomUUID()}@example.test`;
  await page.goto(site + '/account?mode=register&role=consumer');
  await page.locator('#name').fill('Local Acceptance');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Local-' + randomUUID() + '!');
  await page.locator('#consent').check();
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('#verification')).toBeVisible();
  checks.push('Registration through real cookie/CSRF API');
  step = 'queued SMTP delivery to local Mailpit';
  let code;
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email));
    if (!response.ok) throw new Error('Mailbox unavailable');
    const messages = (await response.json()).messages;
    if (messages?.length) {
      const message = await (await fetch(mailbox + '/api/v1/message/' + messages[0].ID)).json();
      code = message.Text?.match(/\b\d{6}\b/)?.[0];
      if (code) break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!code) throw new Error('Queued email did not arrive');
  checks.push('Real database queue worker delivers verification email over SMTP to Mailpit');
  step = 'email verification';
  await page.locator('#verification').fill(code);
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/\/mijn-voordelen/);
  checks.push('Mailbox verification code opens consumer dashboard');
  await context.close();
  context = await browser.newContext();
  const headers = { Accept: 'application/json', Origin: site, Referer: site + '/' };
  await context.request.get(api + '/sanctum/csrf-cookie', { headers });
  const xsrf = decodeURIComponent((await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN').value);
  step = 'seeded consumer login';
  const login = await context.request.post(api + '/login', { headers: { ...headers, 'X-XSRF-TOKEN': xsrf },
    data: { email: 'consumer@shopbonus.local', password: 'ShopBonus-Local-2026!' } });
  expect(login.status()).toBe(200);
  const wallet = async () => {
    const response = await context.request.get(api + '/api/v1/me/wallet', { headers });
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const before = await wallet();
  expect(before.balances.points.available).toBeGreaterThanOrEqual(250);
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => { localStorage.setItem('shopbonus-locale', 'en'); localStorage.setItem('shopbonus-locale-explicit', '1'); });
  step = 'points offer and checkout';
  await page.goto(site + '/aanbiedingen/' + fixture.points_offer_slug);
  await expect(page.getByText('250 points', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redeem points', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Voucher checkout' })).toBeVisible();
  expect((await wallet()).balances.points.available).toBe(before.balances.points.available);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Get voucher', exact: true }).click();
  await expect(page).toHaveURL(/\/mijn-voordelen/);
  const after = await wallet();
  expect(after.balances.points.available).toBe(before.balances.points.available - 250);
  expect(after.available_minor).toBe(before.available_minor);
  const overview = page.getByRole('region', { name: 'My points', exact: true });
  // The available and total-spent values can legitimately be identical.
  await expect(overview.getByText(`${after.balances.points.available.toLocaleString('en-GB')} points`, { exact: true }).first()).toBeVisible();
  checks.push('Real points offer → quote without debit → purchase debits exactly 250 points; EUR balance unchanged; dashboard refreshed');
}
main().then(() => { console.log(`PASS: ${checks.length} local real-service smoke checks`); })
  .catch(error => {
    console.error(`FAIL: ${step}`);
    // Checkout diagnostics contain no passwords, mailbox codes or session tokens.
    if (step === 'points offer and checkout') console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    fs.writeFileSync(path.join(root, 'docs/consumer-acceptance-smoke.json'), JSON.stringify({
      date: new Date().toISOString(), environment: 'isolated local SQLite / Mailpit',
      interception: false, status: process.exitCode ? 'FAIL' : 'PARTIAL PASS', checks,
      failed_step: process.exitCode ? step : null,
      limits: ['Local SMTP capture is not external mailbox delivery', 'Not all ten consumer journeys', 'No staging performance or visual approval'],
    }, null, 2) + '\n');
  });
