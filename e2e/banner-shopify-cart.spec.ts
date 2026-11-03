import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const embed = fs.readFileSync(path.resolve('../shopbonus_backend/public/embed/v1.js'), 'utf8');
const adapter = fs.readFileSync(path.resolve('../shopbonus_backend/public/embed/shopify-cart-v1.js'), 'utf8');

for (const width of [1280, 390]) test(`Shopify dummy native cart reaches public embed at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  let cart = { total_price: 9400, currency: 'EUR' };
  let fail = false;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://shopify-dummy.test/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/embed/v1.js' || pathname === '/embed/shopify-cart-v1.js') {
      return route.fulfill({ contentType: 'application/javascript', body: pathname.endsWith('/shopify-cart-v1.js') ? adapter : embed });
    }
    if (pathname === '/en/cart.js') return route.fulfill({ status: fail ? 503 : 200, json: cart });
    if (pathname === '/api/v1/banners/config') return route.fulfill({ json: { data: {
      tracking_allowed: false, editor_origin: 'https://studio-dummy.test', campaigns: [{
        campaign: 'dummy-campaign', version: 1, reward: { threshold_minor: 10000, currency: 'EUR' },
        config: { template: 'cart_progress', placement: { anchor: 'bottom_right' }, devices: ['desktop', 'mobile'],
          content: { heading: 'Dummy reward', terms: 'Spend EUR 100; reward on a later purchase.' } },
      }],
    } } });
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
      <h1>Dummy native product</h1><button id="native-add">Native add</button>
      <script>window.Shopify = { routes: { root: '/en/' } };</script>
      <script src="/embed/shopify-cart-v1.js"></script>
      <script src="/embed/v1.js" data-shopbonus-key="pk_dummy"></script>
      </body></html>` });
  });
  await page.goto('https://shopify-dummy.test/en/products/dummy');
  const widget = page.locator('.sb-widget');
  const bar = widget.locator('.sb-bar');
  await expect(widget.locator('.sb-progress')).toContainText('94');
  await expect(bar.locator('i')).toHaveCSS('width', /.+/);
  expect(await bar.locator('i').evaluate((el) => (el as HTMLElement).style.width)).toBe('94%');
  const native = await page.locator('body').evaluate((el) => el.innerHTML);
  for (const total of [10000, 4700, 0]) {
    cart = { total_price: total, currency: 'EUR' };
    await page.evaluate(() => window.dispatchEvent(new Event('shopbonus:cart-invalidated')));
    await expect.poll(() => bar.locator('i').evaluate((el) => (el as HTMLElement).style.width)).toBe(`${Math.min(100, total / 100)}%`);
  }
  cart = { total_price: 9400, currency: 'USD' };
  await page.evaluate(() => window.dispatchEvent(new Event('shopbonus:cart-invalidated')));
  await expect(bar).toBeHidden();
  await expect(widget.locator('.sb-progress')).toHaveText('Spend EUR 100; reward on a later purchase.');
  cart.currency = 'EUR'; fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event('shopbonus:cart-invalidated')));
  await expect(bar).toBeHidden();
  fail = false;
  await page.evaluate(() => window.dispatchEvent(new Event('shopbonus:cart-invalidated')));
  await expect(bar).toBeVisible();
  await expect.poll(() => bar.locator('i').evaluate((el) => (el as HTMLElement).style.width)).toBe('94%');
  await expect(widget.locator('.sb-handle')).toHaveCount(0);
  expect(await page.locator('body').evaluate((el) => el.innerHTML)).toBe(native);
  const box = await widget.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(errors).toEqual([]);
});
