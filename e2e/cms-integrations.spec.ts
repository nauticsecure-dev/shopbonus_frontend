import { expect, test, type Page } from '@playwright/test';
import { merchantLandingDefaults } from '../src/lib/merchantLandingDefaults';

const block = '01J00000000000000000000001';
const version = '01J00000000000000000000002';
const asset = '01J00000000000000000000003';
const recipe = '01J00000000000000000000004';
const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Approved source' }] };
async function session(page: Page) {
  await page.addInitScript(() => localStorage.setItem('shopbonus-locale', 'en'));
  await page.route('**/api/v1/**', async route => {
    if (route.request().url().endsWith('/me')) return route.fulfill({ json: { data: { id: 'admin', first_name: 'Admin', email: 'admin@example.test', email_verified: true, status: 'active', roles: ['super_admin'], role: 'super_admin', destination: 'admin', locale: 'en', two_factor_enabled: true, workspaces: [] } } });
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
}
test('shared blocks retain local override and draft revision; conflicts remain visible', async ({ page }) => {
  await session(page);
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/cms/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/shared-blocks') && route.request().method() === 'POST') { body = route.request().postDataJSON(); return route.fulfill({ status: 409, json: { error: { message: 'Draft changed; reload' } } }); }
    if (path.endsWith('/shared-blocks')) return route.fulfill({ json: { data: [{ id: block, key: 'shared-intro', revision: 2 }], next: null } });
    if (path.endsWith('/shared-blocks/' + block)) return route.fulfill({ json: { data: { id: block, key: 'shared-intro', revision: 2, versions: [{ id: version, block_id: block, number: 2, locale: 'en', node: paragraph }] }, next: null } });
    if (path.endsWith('/pages')) return route.fulfill({ json: { data: [{ id: 'page1', key: 'test-page', archived: false, locales: { en: { draft_revision: 7 } } }] } });
    if (path.endsWith('/preview')) return route.fulfill({ json: { data: { draft_revision: 7, content: { title: 'Page', body: { type: 'doc', content: [paragraph] } } } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto('/admin/cms/blocks');
  await page.getByRole('button', { name: 'Load blocks', exact: true }).click();
  await page.getByRole('button', { name: 'shared-intro · v2' }).click();
  await page.getByRole('button', { name: 'v2 · en' }).click();
  await page.getByRole('button', { name: 'Load pages', exact: true }).click();
  await page.getByLabel('Target page').selectOption('page1');
  await page.getByLabel('content.0.text', { exact: true }).fill('Local page wording');
  await page.getByRole('button', { name: 'Mount version with local text' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Draft changed' })).toContainText('Draft changed');
  expect(body).toMatchObject({ revision: 7, version_id: version, index: null, overrides: { 'content.0.text': 'Local page wording' } });
});

test('responsive landing preview renders real component text at all three browsing widths', async ({ page }) => {
  await session(page);
  const content = merchantLandingDefaults('en'); content.hero.heading = 'Responsive approved heading';
  content.media = { hero_background: { desktop_asset_id: asset, alt: 'Pinned preview image' } };
  content.media_recipes = { 'media.hero_background.desktop_asset_id': recipe };
  await page.route('**/api/v1/public/content-assets/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDRkAAAAASUVORK5CYII=', 'base64') }));
  await page.route('**/api/v1/**/voor-webshops*', route => route.fulfill({ json: { data: { id: 'page1', draft: content, published: content, content, draft_revision: 3 } } }));
  await page.goto('/voor-webshops');
  await page.getByTestId('cms-edit-voor-webshops').click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const iframe = page.frameLocator('iframe[title="CMS responsive preview"]');
  await expect(iframe.getByRole('heading', { name: 'Responsive approved heading', exact: true })).toBeVisible();
  for (const [label, width] of [['Mobile', 390], ['Tablet', 768], ['Desktop', 1440]] as const) {
    await page.getByRole('button', { name: label + ' · ' + width + 'px' }).click();
    await expect.poll(() => iframe.locator('body').evaluate(() => window.innerWidth)).toBe(width);
    await expect.poll(() => iframe.getByAltText('Pinned preview image').evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('/recipes/' + recipe + '/' + label.toLowerCase());
    await expect.poll(() => iframe.getByAltText('Pinned preview image').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole('button', { name: 'Close preview' }).click();
  await expect(page.locator('iframe[title="CMS responsive preview"]')).toHaveCount(0);
});

test('media queue blocks application until all derivatives are ready and saves an exact recipe pin', async ({ page }) => {
  await session(page);
  const content = merchantLandingDefaults('en');
  let saved: typeof content | undefined;
  let ready = false;
  let creates = 0;
  const media = () => ({ id: asset, width: 80, height: 60, revision: 2, original_available: true, active_recipe: recipe, recipes: [{ id: recipe, version: 2, derivatives: ['desktop', 'tablet', 'mobile'].map(breakpoint => ({ breakpoint, status: ready ? 'ready' : 'queued', url: ready ? '/favicon.ico?' + breakpoint : null })) }] });
  await page.route('**/api/v1/**/voor-webshops*', async route => {
    if (route.request().method() === 'PUT') { saved = route.request().postDataJSON().content; return route.fulfill({ json: { data: { draft_revision: 4 } } }); }
    return route.fulfill({ json: { data: { id: 'page1', draft: content, published: content, content, draft_revision: 3 } } });
  });
  await page.route('**/api/v1/admin/cms/assets**', async route => {
    if (route.request().method() === 'POST') { creates++; return route.fulfill({ json: { data: { media: media() } } }); }
    if (new URL(route.request().url()).pathname.endsWith('/assets')) return route.fulfill({ json: { data: [{ id: asset, width: 80, height: 60 }], next: null } });
    return route.fulfill({ json: { data: media() } });
  });
  await page.goto('/voor-webshops');
  await page.getByTestId('cms-edit-voor-webshops').click();
  await page.getByRole('button', { name: /Page settings/ }).click();
  await page.getByRole('button', { name: /^media$/i }).click();
  await page.getByLabel('Image slot').selectOption('hero_background');
  await page.getByRole('button', { name: 'Load media library' }).click();
  await page.getByRole('button', { name: asset + ' · 80 × 60' }).click();
  await expect(page.getByRole('button', { name: 'Use this version in draft' })).toBeDisabled();
  ready = true;
  await page.getByRole('button', { name: 'Refresh status', exact: true }).click();
  await page.getByRole('button', { name: 'Use this version in draft' }).click();
  await page.getByRole('button', { name: /Page settings/ }).click();
  await expect.poll(() => saved?.media_recipes?.['media.hero_background.desktop_asset_id']).toBe(recipe);
  expect(saved?.media?.hero_background?.desktop_asset_id).toBe(asset);
  expect(creates).toBe(0);
});


test('AI review shows reservation and estimate and preserves server independence enforcement', async ({ page }) => {
  await session(page);
  const id = '01J00000000000000000000005';
  const proposal = { id, page: 'page1', kind: 'translate', source_locale: 'nl', target_locale: 'de', source_revision: 7, target_revision: 3, status: 'proposed', proposed: { title: 'German proposal', body: { type: 'doc', content: [paragraph] } }, budget: { currency: 'EUR', reserved_micros: 25000, estimated_micros: 10000 } };
  let review: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/cms/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/pages')) return route.fulfill({ json: { data: [{ id: 'page1', key: 'test-page' }] } });
    if (path.endsWith('/suggestions')) return route.fulfill({ json: { data: [proposal] } });
    if (path.endsWith('/suggestions/' + id)) return route.fulfill({ json: { data: proposal } });
    if (path.endsWith('/preview')) return route.fulfill({ json: { data: { draft_revision: 7, content: { title: 'Original Dutch source', body: { type: 'doc', content: [paragraph] } } } } });
    if (path.endsWith('/review')) { review = route.request().postDataJSON(); return route.fulfill({ status: 403, json: { error: { message: 'A different administrator must review this proposal.' } } }); }
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto('/admin/cms/ai');
  await page.getByRole('button', { name: 'Load pages', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('page1');
  await page.getByRole('button', { name: /nl → de/ }).click();
  await expect(page.getByRole('heading', { name: 'Original Dutch source' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'German proposal' })).toBeVisible();
  await page.getByLabel('Language correct').check();
  await page.getByLabel('Meaning preserved').check();
  await page.getByLabel('Review note').fill('Checked language and meaning against the Dutch source.');
  await page.getByRole('button', { name: 'Record independent review' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'different administrator' })).toBeVisible();
  expect(review).toMatchObject({ locale: 'de', language_correct: true, meaning_preserved: true });
  await expect(page.getByRole('button', { name: /nl → de/ })).toContainText('Reserved: €0.025000');
});
