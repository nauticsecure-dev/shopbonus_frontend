// Local real HTTP/CSRF/session + database queue + SMTP, without starting a browser.
const { request, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = 'http://localhost:8038', mailbox = 'http://127.0.0.1:8039';
const checks = [];
let context, step = 'connect';
async function client() {
  return request.newContext({ baseURL: api, extraHTTPHeaders: { Accept: 'application/json', Origin: 'http://localhost:3038', Referer: 'http://localhost:3038/', 'Accept-Language': 'en' } });
}
async function post(url, data, extra = {}) {
  const token = (await context.storageState()).cookies.find(cookie => cookie.name === 'XSRF-TOKEN');
  return context.post(url, { data, headers: { 'X-XSRF-TOKEN': decodeURIComponent(token.value), ...extra } });
}
async function main() {
  context = await client();
  expect((await context.get('/sanctum/csrf-cookie')).status()).toBe(204);
  const legal = (await (await context.get('/api/v1/public/legal-requirements?locale=en')).json()).data;
  const email = `acceptance-${randomUUID()}@example.test`;
  step = 'register';
  expect((await post('/register', { account_type: 'consumer', first_name: 'Local Acceptance', email,
    password: 'Local-' + randomUUID() + '!', accept_terms: true, locale: 'en',
    terms_version: legal.documents.terms.version, privacy_version: legal.documents.privacy.version })).status()).toBe(201);
  checks.push('Real registration with legal versions and CSRF/session protection');
  step = 'queued SMTP verification email';
  let code;
  for (let attempt = 0; attempt < 60; attempt++) {
    const messages = await (await fetch(mailbox + '/api/v1/search?query=' + encodeURIComponent('to:' + email))).json();
    if (messages.messages?.length) {
      const mail = await (await fetch(mailbox + '/api/v1/message/' + messages.messages[0].ID)).json();
      code = mail.Text?.match(/\b\d{6}\b/)?.[0];
      if (code) break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!code) throw new Error('No email delivered');
  expect((await post('/api/v1/auth/email/verify-code', { code })).status()).toBe(200);
  expect((await (await context.get('/api/v1/me')).json()).data.email_verified).toBe(true);
  checks.push('Database queue → real SMTP capture → six-digit email verification → verified identity');
  await context.dispose();
  context = await client();
  await context.get('/sanctum/csrf-cookie');
  step = 'seeded consumer login';
  expect((await post('/login', { email: 'consumer@shopbonus.local', password: 'ShopBonus-Local-2026!' })).status()).toBe(200);
  const wallet = async () => (await (await context.get('/api/v1/me/wallet')).json()).data;
  const before = await wallet();
  const fixture = JSON.parse(fs.readFileSync(path.join(root, '.consumer-acceptance/fixtures.json')));
  const data = { offer: fixture.points_offer_slug, wallet_unit: 'points', use_wallet: true };
  step = 'points quote';
  const quote = await post('/api/v1/consumer/checkouts/quote', data);
  expect(quote.status()).toBe(200);
  expect((await quote.json()).data.price_points).toBe(250);
  expect((await wallet()).balances.points.available).toBe(before.balances.points.available);
  step = 'points purchase and idempotent replay';
  const headers = { 'Idempotency-Key': randomUUID() };
  const purchase = await post('/api/v1/consumer/checkouts', data, headers);
  expect(purchase.status()).toBe(201);
  const checkout = (await purchase.json()).data;
  expect(checkout.state).toBe('completed');
  const replay = await post('/api/v1/consumer/checkouts', data, headers);
  expect(replay.status()).toBe(200);
  expect((await replay.json()).data.id).toBe(checkout.id);
  const after = await wallet();
  expect(after.balances.points.available).toBe(before.balances.points.available - 250);
  expect(after.available_minor).toBe(before.available_minor);
  expect(after.balances.points.pending).toBe(before.balances.points.pending);
  checks.push('Quote leaves points intact; purchase/replay debits 250 points once; EUR and pending points unchanged');
  const history = await context.get('/api/v1/consumer/wallet/transactions?unit=points');
  expect(history.status()).toBe(200);
  expect((await history.json()).data.every(row => row.unit === 'points')).toBe(true);
  checks.push('Real unit-filtered central wallet activity');
}
main().then(() => console.log(`PASS: ${checks.length} real local API/SMTP checks`))
  .catch(() => { console.error(`FAIL: ${step}`); process.exitCode = 1; })
  .finally(async () => {
    await context?.dispose();
    fs.writeFileSync(path.join(root, 'docs/consumer-acceptance-api-smoke.json'), JSON.stringify({ date: new Date().toISOString(),
      environment: 'isolated local SQLite / Mailpit', interception: false, status: process.exitCode ? 'FAIL' : 'PARTIAL PASS',
      checks, failed_step: process.exitCode ? step : null,
      limits: ['API smoke, not full browser journeys', 'SMTP capture, not external mailbox delivery', 'No provider/staging/visual acceptance'] }, null, 2) + '\n');
  });
