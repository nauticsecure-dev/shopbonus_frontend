import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultBannerConfig } from '../src/lib/banners';
const embed = fs.readFileSync(path.resolve('../shopbonus_backend/public/embed/v1.js'), 'utf8');

async function setup(page: Page, failure = 0) {
  const state = { saves: 0, publishes: 0, config: defaultBannerConfig(), revision: 1 };
  await page.addInitScript(() => {
    const store = window as unknown as { embedMessages: unknown[] }; store.embedMessages = [];
    window.addEventListener('message', (ev) => { if (ev.data?.schema === 'shopbonus.banner.v1') store.embedMessages.push(ev.data); });
  });
  const origin = 'https://merchant-fixture.test';
  const detail = () => ({ id: 'campaign', name: 'Storefront test', status: 'draft', draft_revision: state.revision, draft_config: state.config });
  await page.context().route('https://merchant-fixture.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Actual merchant theme fixture</h1><p>Native product and cart</p><div id="placement">Native placement slot</div><script src="https://embed-fixture.test/embed/v1.js" data-shopbonus-key="pk_test"></script>' }));
  await page.context().route('https://embed-fixture.test/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/embed/v1.js')) return route.fulfill({ contentType: 'application/javascript', body: embed });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-banner-editor-token', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const data = url.includes('/editor/pair') ? { editor_token: 'private-editor', expires_in: 1800 } : url.includes('/editor/campaigns/') ? detail() : { campaigns: [], editor_origin: new URL(page.url()).origin, tracking_allowed: false };
    return route.fulfill({ headers, json: { data } });
  });
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/**', async (route) => {
    if (route.request().url().startsWith('https://embed-fixture.test')) return route.fallback();
    const url = new URL(route.request().url()), p = url.pathname;
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (p === '/api/v1/me') return route.fulfill({ json: { data: { id: 'owner', first_name: 'Owner', email: 'owner@example.test', email_verified: true, status: 'active', role: 'merchant', roles: [], onboarding_intent: 'merchant', destination: 'workspace', two_factor_enabled: true, workspaces: [{ id: 'shop', name: 'Merchant fixture', role: 'owner', status: 'approved', is_current: true }] } } });
    if (p.endsWith('/onboarding')) return route.fulfill({ json: { data: { webshop_status: 'approved', next_step: null } } });
    if (p.endsWith('/banners/installation')) return route.fulfill({ json: { data: { public_key: 'pk_test', allowed_origins: [origin], status: 'installed' } } });
    if (p.endsWith('/banners/pairing')) return route.fulfill({ json: { data: { pairing_token: 'single-use', expires_in: 600 } } });
    if (p.endsWith('/banners/campaign/publish')) { state.publishes++; return route.fulfill({ json: { data: { ...detail(), status: 'live' } } }); }
    if (p.endsWith('/banners/campaign')) {
      if (route.request().method() === 'PUT') {
        state.saves++;
        if (failure) return route.fulfill({ status: failure, json: { error: { message: 'Draft save rejected', code: 'draft_revision_conflict' } } });
        state.config = route.request().postDataJSON().config; state.revision++;
      }
      return route.fulfill({ json: { data: detail() } });
    }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/dashboard/banners/campaign/studio');
  await expect(page.getByLabel('Heading', { exact: true })).toBeVisible();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Actual merchant theme fixture' })).toBeVisible();
  return state;
}

for (const status of [409, 500]) test(`save ${status} stops publication and preserves edits`, async ({ page }) => {
  const state = await setup(page, status);
  await page.getByLabel('Heading', { exact: true }).fill('Unsaved merchant edit');
  await page.getByTestId('publish-campaign').click();
  await expect(page.getByText('Draft save rejected', { exact: true })).toBeVisible();
  expect(state.saves).toBe(1); expect(state.publishes).toBe(0);
  await expect(page.getByTestId('unsaved-warning')).toBeVisible();
});

test('real embed pairs in the storefront frame, updates edits, and saves before publishing', async ({ page }) => {
  const state = await setup(page);
  const widget = page.frameLocator('iframe').locator('.sb-widget');
  await expect(widget).toBeVisible();
  await page.getByLabel('Heading', { exact: true }).fill('Live private draft');
  await expect(widget.locator('.sb-heading')).toHaveText('Live private draft');
  await page.getByTestId('publish-campaign').click();
  await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
  await expect.poll(() => state.publishes).toBe(1); expect(state.saves).toBe(1);
  expect(state.config.content.heading).toBe('Live private draft');
  await page.screenshot({ path: test.info().outputPath('live-storefront-desktop.png') });
  await page.getByTestId('device-mobile').click();
  await expect(page.locator('iframe')).toHaveJSProperty('clientWidth', 390);
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Actual merchant theme fixture' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('live-storefront-mobile.png') });
});

test('resize handles save dimensions and layers remain individually editable', async ({ page }) => {
  const state = await setup(page);
  const frame = page.frameLocator('iframe');
  await page.getByLabel('Heading', { exact: true }).fill('Ready for resize');
  await expect(frame.locator('.sb-heading')).toHaveText('Ready for resize');
  await page.getByTestId('save-draft').click();
  await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
  const handle = frame.locator('.sb-handle[data-corner="se"]'); await expect(handle).toBeVisible();
  const box = await handle.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 5, box!.y + 5); await page.mouse.down(); await page.mouse.move(box!.x + 65, box!.y + 45, { steps: 5 }); await page.mouse.up();
  await expect(page.getByTestId('unsaved-warning')).toBeVisible();
  await page.getByLabel('text font size').fill('24');
  await page.getByTestId('save-draft').click();
  await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
  expect(state.config.placement.width).toBeGreaterThan(360);
  expect(state.config.layers?.find((l) => l.type === 'text')?.font_size).toBe(24);
});


test('inline missing target hides the banner and a valid target restores it', async ({ page }) => {
  await setup(page);
  await expect(page.frameLocator('iframe').locator('.sb-widget')).toBeVisible();
  await page.getByLabel('Position', { exact: true }).selectOption('inline');
  await expect(page.getByText('The placement target is missing. Select a new target or corner anchor.', { exact: true })).toBeVisible();
  await expect(page.frameLocator('iframe').locator('.sb-widget')).toHaveCount(0);
  await page.getByLabel('Inline target selector').fill('#placement');
  await expect(page.frameLocator('iframe').locator('.sb-widget')).toBeVisible();
});


test('editor rejects messages with forged origin or source despite a correct nonce', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Heading', { exact: true }).fill('Authenticated draft');
  await expect(page.frameLocator('iframe').locator('.sb-heading')).toHaveText('Authenticated draft');
  await page.getByTestId('save-draft').click(); await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
  await page.evaluate(() => {
    const messages = (window as unknown as { embedMessages: { type: string; nonce: string }[] }).embedMessages;
    const nonce = messages.find((m) => m.type === 'editor.paired')!.nonce;
    const data = { schema: 'shopbonus.banner.v1', key: 'pk_test', nonce, type: 'banner.moved', campaign: 'campaign', offset_x: 80, offset_y: 40 };
    window.dispatchEvent(new MessageEvent('message', { data, origin: 'https://evil.test', source: document.querySelector('iframe')!.contentWindow }));
    window.dispatchEvent(new MessageEvent('message', { data, origin: 'https://merchant-fixture.test', source: window }));
  });
  await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
});


test('popup pairs through its opener and receives private edits', async ({ page }) => {
  await setup(page);
  await expect(page.frameLocator('iframe').locator('.sb-widget')).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Actual merchant theme fixture' })).toBeVisible();
  await page.getByLabel('Heading', { exact: true }).fill('Private popup design');
  await expect(popup.locator('.sb-heading')).toHaveText('Private popup design');
  await popup.close();
});

test('drag snaps to a stable corner and persists the anchor', async ({ page }) => {
  const state = await setup(page);
  await page.getByLabel('Heading', { exact: true }).fill('Corner snap test');
  const widget = page.frameLocator('iframe').locator('.sb-widget');
  await expect(widget.locator('.sb-heading')).toHaveText('Corner snap test');
  const box = await widget.boundingBox(), frame = await page.locator('iframe').boundingBox();
  expect(box).not.toBeNull(); expect(frame).not.toBeNull();
  await page.mouse.move(box!.x + 40, box!.y + 20); await page.mouse.down();
  await page.mouse.move(frame!.x + 16 + 40, frame!.y + 16 + 20, { steps: 8 }); await page.mouse.up();
  await expect(page.getByLabel('Position', { exact: true })).toHaveValue('top_left');
  await page.getByTestId('save-draft').click(); await expect(page.getByTestId('unsaved-warning')).toHaveCount(0);
  expect(state.config.placement.anchor).toBe('top_left'); expect(state.config.placement.offset_x).toBe(0); expect(state.config.placement.offset_y).toBe(0);
});
