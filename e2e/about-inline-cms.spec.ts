import { expect, test, type Page } from '@playwright/test';
import type { Locale } from '../src/types/locale';
import { mergeAboutUsContent } from '../src/lib/aboutUsDefaults';

// Controlled browser API contracts; Laravel integration tests cover storage and authorization.
async function setup(page: Page, admin = true, locale: Locale = 'nl') {
  const published = mergeAboutUsContent(null, 'nl'); published.hero.heading = 'Goedgekeurde publicatie'; published.seo_title = 'Goedgekeurde SEO';
  const draft = structuredClone(published); draft.hero.heading = 'Saved unpublished draft';
  const older = structuredClone(published); older.hero.heading = 'Historical publication';
  const state = { draft, published, saves: 0, publishes: 0, revision: 1, fail: 0, unavailable: false, malformed: false, restored: '', loads: 0, uploads: 0, scheduled: null as null | { revision: number; due_at: string } };
  await page.addInitScript((selectedLocale) => {
    localStorage.setItem('shopbonus-locale', selectedLocale);
    document.cookie = 'XSRF-TOKEN=cms-test-token; Path=/; SameSite=Lax';
  }, locale);
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path === '/api/v1/me') return route.fulfill({ status: admin ? 200 : 401, json: admin ? { data: { id: 'admin', first_name: 'Admin', email: 'admin@example.test', email_verified: true, status: 'active', roles: ['super_admin'], destination: 'admin', locale, two_factor_enabled: true, workspaces: [] } } : {} });
    if (path === '/api/v1/content/over-ons') {
      if (state.unavailable) return route.fulfill({ status: 404, json: {} });
      if (state.malformed) return route.fulfill({ json: { data: {} } });
      const content = url.searchParams.get('locale') === 'en' ? { ...mergeAboutUsContent(null, 'en'), seo_title: 'Approved English SEO', hero: { ...published.hero, heading: 'Approved English publication' } } : state.published;
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
    if (path.endsWith('/versions')) return route.fulfill({ json: { data: [{ id: 'v3', number: 3, locale, published_at: '2026-10-30T12:00:00Z', content: published }, { id: 'v1', number: 1, locale, published_at: '2026-10-28T12:00:00Z', content: older }] } });
    if (path.endsWith('/restore')) { state.restored = request.postDataJSON().revision_id; state.published = older; return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith('/assets')) { state.uploads++; return route.fulfill({ json: { data: { id: 'cropped-image', url: '/favicon.ico' } } }); }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/over-ons', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: locale === 'en' ? 'Approved English publication' : 'Goedgekeurde publicatie' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Pagina-instellingen, media en geschiedenis' }).click(); await page.getByRole('button', { name: 'Geschiedenis', exact: true }).click();
  await page.getByLabel('Gepubliceerde versie').selectOption('v1');
  await expect(page.getByRole('cell', { name: 'Historical publication', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Geselecteerde publicatie herstellen' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Versie 1/ }).check();
  await page.getByRole('button', { name: 'Geselecteerde publicatie herstellen' }).click();
  await expect.poll(() => state.restored).toBe('v1');
  await expect(page.getByRole('heading', { name: /Historical publication/ })).toBeVisible();
});
test('public language switch updates publication and metadata', async ({ page }) => {
  await setup(page, false);
  await expect(page).toHaveTitle('Goedgekeurde SEO');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Goedgekeurde SEO');
  await page.getByRole('group', { name: /Taal|Language/i }).getByRole('button', { name: /^en$/i }).click();
  await expect(page.getByRole('heading', { name: /Approved English publication/ })).toBeVisible();
  await expect(page).toHaveTitle('Approved English SEO');
  // Next streams refreshed metadata after the initial head tags during navigation.
  await expect(page.locator('meta[property="og:title"]').last()).toHaveAttribute('content', 'Approved English SEO');
  await expect(page.locator('meta[name="description"]').last()).toHaveAttribute('content', mergeAboutUsContent(null, 'en').seo_description);
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
  await page.getByRole('button', { name: 'Pagina-instellingen, media en geschiedenis' }).click();
  for (const section of ['Navigatie', 'Afsluitende oproep', 'Waarden', 'Team', 'Contact', 'SEO-titel']) await page.locator('summary').filter({ hasText: section }).click();
  await page.locator('[data-cms-field="nav.links.0.label"]').fill('Approved navigation');
  await page.locator('[data-cms-field="nav.links.0.href"]').fill('/faq');
  await page.locator('[data-cms-field="bottom_cta.consumer_cta.href"]').fill('/support');
  await page.locator('[data-cms-field="values.items.0.icon"]').selectOption('users');
  await page.getByRole('button', { name: 'Profielen toevoegen', exact: true }).click();
  await page.locator('[data-cms-field="team.profiles.0.name"]').fill('Approved team member');
  await page.locator('[data-cms-field="team.show_profiles"]').check();
  await page.locator('[data-cms-field="contact.legal_name"]').fill('Verified fixture company');
  await page.locator('[data-cms-field="seo_title"]').fill('Reviewed SEO');
  await page.getByRole('button', { name: 'Secties', exact: true }).click();
  await page.getByLabel('Verplaats Introductie omlaag', { exact: true }).click(); await page.getByLabel('Waarden tonen', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.draft.nav.links[0].label).toBe('Approved navigation');
  expect(state.draft.nav.links[0].href).toBe('/faq'); expect(state.draft.bottom_cta.consumer_cta.href).toBe('/support');
  expect(state.draft.values.items[0].icon).toBe('users'); expect(state.draft.team.profiles[0].name).toBe('Approved team member');
  expect(state.draft.contact.legal_name).toBe('Verified fixture company'); expect(state.draft.seo_title).toBe('Reviewed SEO');
  expect(state.draft.section_order[0]).toBe('story'); expect(state.draft.section_visibility.values).toBe(false);
});
test('crop upload applies mobile variant and strips display URLs from save', async ({ page }) => {
  const state = await setup(page); await edit(page); const image = await page.screenshot();
  await page.getByRole('button', { name: 'Pagina-instellingen, media en geschiedenis' }).click(); await page.getByRole('button', { name: 'Media', exact: true }).click();
  await page.getByLabel('Afbeeldingsvariant').selectOption('mobile'); await page.getByLabel('Alternatieve tekst van afbeelding').fill('Approved company photo');
  await page.getByLabel('Afbeelding vervangen').setInputFiles({ name: 'company.png', mimeType: 'image/png', buffer: image });
  await page.getByLabel('Beeldverhouding').selectOption('1'); await page.getByRole('button', { name: 'Bijgesneden afbeelding uploaden' }).click();
  await page.getByRole('button', { name: 'Afbeelding toepassen', exact: true }).click();
  await expect(page.locator('picture source').first()).toHaveAttribute('srcset', '/favicon.ico');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => state.draft.media?.hero?.mobile_asset_id).toBe('cropped-image'); expect(state.draft.media?.hero?.mobile_url).toBeUndefined(); expect(state.uploads).toBe(1);
});
test('queued publication uses saved revision and retains live content', async ({ page }) => {
  const state = await setup(page); await edit(page);
  await page.getByRole('button', { name: 'Pagina-instellingen, media en geschiedenis' }).click(); await page.getByRole('button', { name: 'Planning', exact: true }).click();
  await page.getByLabel('Publiceren op', { exact: true }).fill('2099-01-01T12:00');
  await page.getByRole('button', { name: 'Publicatie inplannen', exact: true }).click();
  await expect.poll(() => state.scheduled?.revision).toBe(2); expect(state.publishes).toBe(0);
  await expect(page.getByRole('heading', { name: /Goedgekeurde publicatie/ })).toBeVisible();
});

for (const locale of ['nl', 'en', 'de'] as const) test('settings controls follow locale: ' + locale, async ({ page }) => {
  await setup(page, true, locale); await edit(page);
  const labels = {
    nl: { settings: 'Pagina-instellingen, media en geschiedenis', media: 'Media', instructions: 'Gebruik goedgekeurde bedrijfsfoto’s.', slot: 'Afbeeldingspositie', replace: 'Afbeelding vervangen', schedule: 'Planning', publish: 'Publiceren op', history: 'Geschiedenis', version: 'Gepubliceerde versie', restore: 'Geselecteerde publicatie herstellen', confirm: 'Versie 1 (nl) direct publiceren', field: 'Veld', caption: 'Versie 1 vergeleken met het huidige concept' },
    en: { settings: 'Page settings, media & history', media: 'media', instructions: 'Use approved company photography.', slot: 'Image slot', replace: 'Replace image', schedule: 'schedule', publish: 'publish at', history: 'history', version: 'Published version', restore: 'Restore selected publication', confirm: 'Publish version 1 (en) immediately', field: 'Field', caption: 'Version 1 compared with current draft' },
    de: { settings: 'Seiteneinstellungen, Medien und Verlauf', media: 'Medien', instructions: 'Verwenden Sie freigegebene Unternehmensfotos.', slot: 'Bildposition', replace: 'Bild ersetzen', schedule: 'Zeitplan', publish: 'Veröffentlichen am', history: 'Verlauf', version: 'Veröffentlichte Version', restore: 'Ausgewählte Veröffentlichung wiederherstellen', confirm: 'Version 1 (de) sofort veröffentlichen', field: 'Feld', caption: 'Version 1 im Vergleich zum aktuellen Entwurf' },
  }[locale];
  await page.getByRole('button', { name: labels.settings, exact: true }).click();
  await page.getByRole('button', { name: labels.media, exact: true }).click();
  await expect(page.getByText(labels.instructions, { exact: false })).toBeVisible();
  await expect(page.getByLabel(labels.slot, { exact: true })).toHaveValue('hero');
  await expect(page.getByLabel(labels.replace, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: labels.schedule, exact: true }).click();
  await expect(page.getByLabel(labels.publish, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: labels.history, exact: true }).click();
  await page.getByLabel(labels.version, { exact: true }).selectOption('v1');
  const date = new Date('2026-10-28T12:00:00Z').toLocaleString({ nl: 'nl-NL', en: 'en-GB', de: 'de-DE' }[locale]);
  await expect(page.getByLabel(labels.version).locator('option:checked')).toContainText(date);
  await expect(page.getByRole('columnheader', { name: labels.field, exact: true })).toBeVisible();
  await expect(page.locator('caption')).toHaveText(labels.caption);
  await expect(page.getByRole('button', { name: labels.restore, exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: labels.confirm, exact: true }).check();
  await expect(page.getByRole('button', { name: labels.restore, exact: true })).toBeEnabled();
});
