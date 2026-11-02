import { expect, test, type Page } from '@playwright/test';
import { mergeAboutUsContent } from '../src/lib/aboutUsDefaults';

// Controlled browser API contracts; Laravel integration tests cover storage and authorization.
async function setup(page: Page, admin = true) {
  const published = mergeAboutUsContent(null, 'nl'); published.hero.heading = 'Goedgekeurde publicatie';
  const draft = structuredClone(published); draft.hero.heading = 'Saved unpublished draft';
  const older = structuredClone(published); older.hero.heading = 'Historical publication';
  const state = { draft, published, saves: 0, publishes: 0, revision: 1, fail: 0, unavailable: false, malformed: false, restored: '', loads: 0, uploads: 0, scheduled: null as null | { revision: number; due_at: string } };
  await page.addInitScript(() => localStorage.setItem('shopbonus-locale', 'nl'));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path === '/api/v1/me') return route.fulfill({ status: admin ? 200 : 401, json: admin ? { data: { id: 'admin', first_name: 'Admin', email: 'admin@example.test', email_verified: true, status: 'active', roles: ['super_admin'], destination: 'admin', locale: 'nl', two_factor_enabled: true, workspaces: [] } } : {} });
    if (path === '/api/v1/content/over-ons') {
      if (state.unavailable) return route.fulfill({ status: 404, json: {} });
      if (state.malformed) return route.fulfill({ json: { data: {} } });
      const content = url.searchParams.get('locale') === 'en' ? { ...mergeAboutUsContent(null, 'en'), hero: { ...published.hero, heading: 'Approved English publication' } } : state.published;
      return route.fulfill({ json: { data: { content } } });
    }
    if (path === '/api/v1/admin/content/over-ons') {
      if (request.method() === 'PUT') {
        state.saves++;
        if (state.fail) return route.fulfill({ status: state.fail, json: { error: { message: state.fail === 409 ? 'Revision conflict' : 'Validation failed' } } });
        state.draft = request.postDataJSON().content;
        return route.fulfill({ json: { data: { draft_revision: ++state.revision } } });
      }
      state.loads++;
      return route.fulfill({ json: { data: { id: 'about-page', draft: state.draft, published: state.published, draft_revision: state.revision } } });
    }
    if (path.endsWith('/schedules') && request.method() === 'POST') { state.scheduled = request.postDataJSON(); return route.fulfill({ status: 201, json: { data: {} } }); }
    if (path.endsWith('/publish')) { state.publishes++; state.published = structuredClone(state.draft); return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith('/versions')) return route.fulfill({ json: { data: [{ id: 'v3', number: 3, locale: 'nl', published_at: '2026-10-30T12:00:00Z', content: published }, { id: 'v1', number: 1, locale: 'nl', published_at: '2026-10-28T12:00:00Z', content: older }] } });
    if (path.endsWith('/restore')) { state.restored = request.postDataJSON().revision_id; state.published = older; return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith('/assets')) { state.uploads++; return route.fulfill({ json: { data: { id: 'cropped-image', url: '/favicon.ico' } } }); }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/over-ons');
  await expect(page.getByRole('heading', { name: 'Goedgekeurde publicatie' })).toBeVisible();
  return state;
}
async function edit(page: Page) {
  await page.getByTestId('cms-edit-over-ons').click();
  await expect(page.locator('[data-cms-edit="hero.heading"]')).toContainText('Saved unpublished draft');
}
async function changeHeading(page: Page, text: string) {
  await page.locator('[data-cms-edit="hero.heading"]').click();
  await page.locator('input').filter({ visible: true }).last().fill(text);
  await page.getByRole('button', { name: 'Toepassen', exact: true }).click();
}
for (const status of [422, 409]) test(`failed save ${status} prevents publication`, async ({ page }) => {
  const state = await setup(page); await edit(page); state.fail = status;
  await changeHeading(page, 'Current edits');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: status === 409 ? 'Revision conflict' : 'Validation failed' })).toBeVisible();
  expect(state.saves).toBe(1); expect(state.publishes).toBe(0);
  await expect(page.locator('[data-cms-edit="hero.heading"]')).toContainText('Current edits');
});
test('saving then Cancel restores publication; reentry loads saved draft', async ({ page }) => {
  const state = await setup(page); await edit(page); await changeHeading(page, 'Saved edited draft');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.saves).toBe(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Goedgekeurde publicatie' })).toBeVisible();
  await page.getByTestId('cms-edit-over-ons').click();
  await expect(page.locator('[data-cms-edit="hero.heading"]')).toContainText('Saved edited draft');
});
test('preview retains unsaved changes and publication appears immediately', async ({ page }) => {
  const state = await setup(page); await edit(page); await changeHeading(page, 'New publication');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: /New publication/ })).toBeVisible(); expect(state.loads).toBe(1);
  await page.getByRole('button', { name: 'Back to edit', exact: true }).click();
  await expect(page.locator('[data-cms-edit="hero.heading"]')).toContainText('New publication'); expect(state.loads).toBe(1);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByTestId('cms-edit-over-ons')).toBeVisible();
  await expect(page.getByRole('heading', { name: /New publication/ })).toBeVisible(); expect(state.publishes).toBe(1);
});
test('historical version comparison and explicit restoration confirmation', async ({ page }) => {
  const state = await setup(page); await edit(page);
  await page.getByRole('button', { name: /Page settings/ }).click(); await page.getByRole('button', { name: 'history', exact: true }).click();
  await page.getByLabel('Published version').selectOption('v1');
  await expect(page.getByRole('cell', { name: 'Historical publication', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore selected publication' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Publish version 1/ }).check();
  await page.getByRole('button', { name: 'Restore selected publication' }).click();
  await expect.poll(() => state.restored).toBe('v1');
  await expect(page.getByRole('heading', { name: /Historical publication/ })).toBeVisible();
});
test('public language switch updates publication and metadata', async ({ page }) => {
  await setup(page, false);
  await page.getByRole('group', { name: /Taal|Language/i }).getByRole('button', { name: /^en$/i }).click();
  await expect(page.getByRole('heading', { name: /Approved English publication/ })).toBeVisible();
  await expect(page).toHaveTitle('Approved English SEO');
  await expect(page.getByTestId('cms-edit-over-ons')).toHaveCount(0);
});
for (const malformed of [false, true]) test(`unavailable or malformed publication has no marketing fallback (${malformed})`, async ({ page }) => {
  const state = await setup(page, false); state.unavailable = !malformed; state.malformed = malformed;
  await page.reload();
  await expect(page.getByTestId('about-unavailable')).toBeVisible();
  await expect(page.getByTestId('about-story')).toHaveCount(0);
});
test('settings author navigation, CTA, icon, profiles, verified details, sections and SEO', async ({ page }) => {
  const state = await setup(page); await edit(page);
  await page.getByRole('button', { name: /Page settings/ }).click();
  for (const section of ['nav', 'bottom_cta', 'values', 'team', 'contact', 'seo_title']) await page.locator('summary').filter({ hasText: new RegExp(`^${section}$`) }).click();
  await page.getByLabel('nav.links.0.label', { exact: true }).fill('Approved navigation');
  await page.getByLabel('nav.links.0.href', { exact: true }).fill('/faq');
  await page.getByLabel('bottom_cta.consumer_cta.href', { exact: true }).fill('/support');
  await page.getByLabel('values.items.0.icon', { exact: true }).selectOption('users');
  await page.getByRole('button', { name: 'Add profiles', exact: true }).click();
  await page.getByLabel('team.profiles.0.name', { exact: true }).fill('Approved team member');
  await page.getByLabel('team.show_profiles', { exact: true }).check();
  await page.getByLabel('contact.legal_name', { exact: true }).fill('Verified fixture company');
  await page.getByLabel('seo_title', { exact: true }).fill('Reviewed SEO');
  await page.getByRole('button', { name: 'sections', exact: true }).click();
  await page.getByLabel('Move hero down', { exact: true }).click(); await page.getByLabel('Show values', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.draft.nav.links[0].label).toBe('Approved navigation');
  expect(state.draft.nav.links[0].href).toBe('/faq'); expect(state.draft.bottom_cta.consumer_cta.href).toBe('/support');
  expect(state.draft.values.items[0].icon).toBe('users'); expect(state.draft.team.profiles[0].name).toBe('Approved team member');
  expect(state.draft.contact.legal_name).toBe('Verified fixture company'); expect(state.draft.seo_title).toBe('Reviewed SEO');
  expect(state.draft.section_order[0]).toBe('story'); expect(state.draft.section_visibility.values).toBe(false);
});
test('crop upload applies mobile variant and strips display URLs from save', async ({ page }) => {
  const state = await setup(page); await edit(page); const image = await page.screenshot();
  await page.getByRole('button', { name: /Page settings/ }).click(); await page.getByRole('button', { name: 'media', exact: true }).click();
  await page.getByLabel('Image variant').selectOption('mobile'); await page.getByLabel('Image alternative text').fill('Approved company photo');
  await page.getByLabel('Replace image').setInputFiles({ name: 'company.png', mimeType: 'image/png', buffer: image });
  await page.getByLabel('Crop ratio').selectOption('1'); await page.getByRole('button', { name: 'Upload cropped image' }).click();
  await page.getByRole('button', { name: 'Apply image', exact: true }).click();
  await expect(page.locator('picture source').first()).toHaveAttribute('srcset', '/favicon.ico');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.draft.media?.hero?.mobile_asset_id).toBe('cropped-image'); expect(state.draft.media?.hero?.mobile_url).toBeUndefined(); expect(state.uploads).toBe(1);
});
test('queued publication uses saved revision and retains live content', async ({ page }) => {
  const state = await setup(page); await edit(page);
  await page.getByRole('button', { name: /Page settings/ }).click(); await page.getByRole('button', { name: 'schedule', exact: true }).click();
  await page.getByLabel('publish_at', { exact: true }).fill('2099-01-01T12:00');
  await page.getByRole('button', { name: 'Schedule publication', exact: true }).click();
  await expect.poll(() => state.scheduled?.revision).toBe(2); expect(state.publishes).toBe(0);
  await expect(page.getByRole('heading', { name: /Goedgekeurde publicatie/ })).toBeVisible();
});
