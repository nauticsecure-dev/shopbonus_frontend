import { expect, test, type Page } from '@playwright/test';
import { merchantLandingDefaults } from '../src/lib/merchantLandingDefaults';

// Browser contracts use controlled API responses. PHPUnit separately verifies storage/auth.
async function setup(page: Page) {
  const published = merchantLandingDefaults('nl'); published.hero.heading = 'Goedgekeurde publicatie';
  const draft = structuredClone(published); draft.hero.heading = 'Saved unpublished draft';
  const state = { draft, published, saves: 0, publishes: 0, revision: 1, fail: 0, restored: '', adminLoads: 0, uploads: 0, scheduled: null as null | { revision: number; due_at: string } };
  await page.addInitScript(() => { localStorage.setItem('shopbonus-locale', 'nl'); });
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path === '/api/v1/me') return route.fulfill({ json: { data: { id: 'admin', first_name: 'Admin', email: 'admin@example.test', email_verified: true, status: 'active', role: 'super_admin', roles: ['super_admin'], destination: 'admin', locale: 'nl', two_factor_enabled: true, workspaces: [] } } });
    if (path === '/api/v1/content/voor-webshops') {
      const content = url.searchParams.get('locale') === 'en' ? { ...merchantLandingDefaults('en'), hero: { ...merchantLandingDefaults('en').hero, heading: 'Approved English publication' } } : state.published;
      return route.fulfill({ json: { data: { content } } });
    }
    if (path.endsWith('/voor-webshops') && path.includes('/admin/')) {
      if (request.method() === 'PUT') {
        state.saves++;
        if (state.fail) return route.fulfill({ status: state.fail, json: { error: { message: state.fail === 409 ? 'Revision conflict' : 'Validation failed' } } });
        state.draft = request.postDataJSON().content;
        return route.fulfill({ json: { data: { draft_revision: ++state.revision } } });
      }
      state.adminLoads++;
      return route.fulfill({ json: { data: { id: 'merchant-page', draft: state.draft, published: state.published, draft_revision: state.revision } } });
    }
    if (path.endsWith('/schedules') && request.method() === 'POST') { state.scheduled = request.postDataJSON(); return route.fulfill({ status: 201, json: { data: { id: 'schedule1', status: 'scheduled' } } }); }
    if (path.endsWith('/publish')) { state.publishes++; state.published = structuredClone(state.draft); return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith('/versions')) return route.fulfill({ json: { data: [{ id: 'v3', number: 3, locale: 'nl', published_at: '2026-10-30T12:00:00Z', content: state.published }, { id: 'v1', number: 1, locale: 'nl', published_at: '2026-10-28T12:00:00Z', content: { ...state.published, hero: { ...state.published.hero, heading: 'Earlier approved heading' } } }] } });
    if (path.endsWith('/restore')) { state.restored = request.postDataJSON().revision_id; return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith('/assets') && request.method() === 'POST') { state.uploads++; return route.fulfill({ json: { data: { id: 'cropped-image', url: '/favicon.ico', width: 768, height: 768 } } }); }
    if (path.endsWith('/assets')) return route.fulfill({ json: { data: [{ id: 'asset1', url: '/favicon.ico', width: 600, height: 400 }], meta: { current_page: 1, last_page: 1 } } });
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/voor-webshops');
  await page.getByTestId('cms-edit-voor-webshops').click();
  await expect(page.getByRole('Koptekst', { name: 'Saved unpublished draft' })).toBeVisible();
  return state;
}
async function changeHeading(page: Page, text: string) {
  await page.locator('[data-cms-edit="hero.heading"]').click();
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: 'Toepassen', exact: true }).click();
}
for (const status of [422, 409]) test('save failure ' + status + ' prevents publication', async ({ page }) => {
  const state = await setup(page); state.fail = status;
  await changeHeading(page, 'Invalid or conflicted draft');
  await page.getByRole('button', { name: 'Publiceren', exact: true }).click();
  await expect.poll(() => state.saves).toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: status === 409 ? 'Versieconflict' : 'Validatie mislukt' })).toBeVisible();
  expect(state.publishes).toBe(0);
});
test('cancel shows approved snapshot and reentry retains saved draft', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Annuleren', exact: true }).click();
  await expect(page.getByRole('Koptekst', { name: 'Goedgekeurde publicatie' })).toBeVisible();
  await expect(page.getByRole('Koptekst', { name: 'Saved unpublished draft' })).toHaveCount(0);
  await page.getByTestId('cms-edit-voor-webshops').click();
  await expect(page.getByRole('Koptekst', { name: 'Saved unpublished draft' })).toBeVisible();
});
test('preview keeps edits and autosave persists before successful publication', async ({ page }) => {
  const state = await setup(page);
  await changeHeading(page, 'New draft for preview');
  await page.getByRole('button', { name: 'Voorbeeld', exact: true }).click();
  await expect(page.getByRole('Koptekst', { name: 'New draft for preview' })).toBeVisible();
  expect(state.adminLoads).toBe(1);
  await expect.poll(() => state.saves).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Publiceren', exact: true }).click();
  await expect.poll(() => state.publishes).toBe(1);
  await expect(page.getByTestId('cms-edit-voor-webshops')).toBeVisible();
});
test('administrator selects the exact historical publication to restore', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Geschiedenis', exact: true }).click();
  await page.getByLabel('Gepubliceerde versie').selectOption('v1');
  const comparison = page.getByRole('region', { name: 'Vergelijken vóór herstellen' });
  await expect(comparison).toContainText('Earlier approved heading');
  await expect(comparison).toContainText('Saved unpublished draft');
  expect(state.restored).toBe('');
  await page.getByRole('button', { name: 'Geselecteerde publicatie herstellen' }).click();
  await expect.poll(() => state.restored).toBe('v1');
});
test('section order, visibility and reusable mobile imagery are editable', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByLabel('Verplaats Introductie omlaag', { exact: true }).click();
  await page.getByLabel('Voordelen', { exact: true }).uncheck();
  await expect(page.getByTestId('merchant-benefits')).toHaveCount(0);
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await page.getByLabel('Afbeeldingsvariant').selectOption('mobile');
  await page.getByLabel('Alternatieve tekst').fill('Approved merchant screenshot');
  await page.getByRole('button', { name: 'asset1' }).click();
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await expect.poll(() => state.draft.media?.hero?.mobile_asset_id).toBe('asset1');
  expect(state.draft.section_order[0]).toBe('platforms');
  expect(state.draft.section_visibility.benefits).toBe(false);
});
test('public switching to English refreshes content and metadata', async ({ page }) => {
  await setup(page); await page.getByRole('button', { name: 'Annuleren', exact: true }).click();
  await page.getByRole('group', { name: /Taal|Language/i }).getByRole('button', { name: /^en$/i }).click();
  await expect(page.getByRole('Koptekst', { name: 'Approved English publication' })).toBeVisible();
  await expect(page).toHaveTitle('Approved English SEO');
});

test('image crop upload assigns a reusable responsive variant', async ({ page }) => {
  const state = await setup(page);
  const image = await page.screenshot();
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await page.getByLabel('Afbeeldingsvariant').selectOption('mobile');
  await page.getByLabel('Alternatieve tekst').fill('Mobile merchant dashboard');
  await page.getByLabel('Afbeelding vervangen').setInputFiles({ name: 'merchant.png', mimeType: 'image/png', buffer: image });
  await page.getByLabel('Beeldverhouding').selectOption('1');
  await page.getByLabel('Horizontaal focuspunt van uitsnede').press('ArrowRight');
  await page.getByRole('button', { name: 'Bijgesneden afbeelding uploaden' }).click();
  await expect.poll(() => state.uploads).toBe(1);
  await expect.poll(() => state.draft.media?.hero?.mobile_asset_id).toBe('cropped-image');
});
test('FAQ collections, footer links and benefit icons can be authored', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Inhoud', exact: true }).click();
  await page.locator('summary').filter({ hasText: /^Veelgestelde vragen$/ }).click();
  await page.getByRole('button', { name: 'Toevoegen Onderdelen', exact: true }).click();
  await page.locator('[data-cms-field="faq.items.8.question"]').fill('New merchant FAQ');
  await page.locator('[data-cms-field="faq.items.8.answer"]').fill('A reviewed answer');
  await page.locator('summary').filter({ hasText: /^Voordelen$/ }).click();
  await page.locator('[data-cms-field="benefits.items.0.icon"]').selectOption('shield');
  await page.locator('summary').filter({ hasText: /^Voettekst$/ }).click();
  await page.getByRole('button', { name: 'Toevoegen Links', exact: true }).click();
  await page.locator('[data-cms-field="footer.links.0.label"]').fill('Merchant help');
  await page.locator('[data-cms-field="footer.links.0.href"]').fill('/help');
  await expect.poll(() => state.draft.footer.links?.[0]?.label).toBe('Merchant help');
  expect(state.draft.faq.items.at(-1)?.question).toBe('New merchant FAQ');
  expect(state.draft.benefits.items[0].icon).toBe('shield');
});
test('public layouts fit desktop and mobile widths', async ({ page }, info) => {
  await setup(page); await page.getByRole('button', { name: 'Annuleren', exact: true }).click();
  await page.screenshot({ path: info.outputPath('merchant-landing-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('hero-primary-cta')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath('merchant-landing-mobile.png'), fullPage: true });
});

test('scheduled publication stays clearly marked outside its visibility window', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Planning', exact: true }).click();
  await page.getByLabel('Publiceren op', { exact: true }).fill('2099-01-01T12:00');
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Publiceren', exact: true }).click();
  await expect.poll(() => state.publishes).toBe(1);
  await expect(page.getByRole('status').filter({ hasText: 'buiten het geplande zichtbaarheidsvenster' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terug naar bewerken', exact: true })).toBeVisible();
});

test('queued publication pins the saved revision and keeps the existing page live', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Planning', exact: true }).click();
  const due = new Date(Date.now() + 600000); due.setSeconds(0, 0);
  const local = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel('Publiceren op', { exact: true }).fill(local);
  await page.getByRole('button', { name: 'Publicatie inplannen', exact: true }).click();
  await expect.poll(() => state.scheduled?.revision === state.revision).toBe(true);
  expect(state.publishes).toBe(0);
  await expect(page.getByRole('Koptekst', { name: 'Goedgekeurde publicatie' })).toBeVisible();
});

test('integration selection survives the onboarding URL and later navigation', async ({ page }) => {
  await setup(page);
  await page.goto('/voor-webshops/aanmelden?platform=woocommerce');
  await expect(page.getByText('Geselecteerde integratie: woocommerce.', { exact: false })).toBeVisible();
  await expect(page.getByRole('Koppeling', { name: /Bekijk integratie en aansluitvoorwaarden/ })).toHaveAttribute('Linkadres', '/dashboard/app-store?platform=woocommerce');
  await page.goto('/voor-webshops/aanmelden');
  await expect(page.getByText('Geselecteerde integratie: woocommerce.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('shopbonus-onboarding-platform'))).toBe('woocommerce');
});

test('leaving the editor saves first and stays on the page if that save fails', async ({ page }) => {
  const state = await setup(page); state.fail = 422;
  await changeHeading(page, 'Save before navigation');
  await page.getByTestId('hero-primary-cta').click();
  await expect(page.getByRole('status').filter({ hasText: 'Validation failed' })).toBeVisible();
  await expect(page).toHaveURL(/\/voor-webshops$/);
  expect(state.publishes).toBe(0);
  state.fail = 0;
  await page.getByTestId('hero-primary-cta').click();
  await expect(page).toHaveURL(/\/voor-webshops\/aanmelden/);
  expect(state.draft.hero.heading).toBe('Save before navigation');
});

test('history refuses restoration when revision content is unavailable', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/admin/content/voor-webshops/versions?*', route => route.fulfill({ json: { data: [{ id: 'missing', number: 1, locale: 'nl', published_at: '2026-10-28T12:00:00Z' }] } }));
  await page.getByRole('button', { name: /Pagina-instellingen/ }).click();
  await page.getByRole('button', { name: 'Geschiedenis', exact: true }).click();
  await page.getByLabel('Gepubliceerde versie').selectOption('missing');
  await expect(page.getByRole('alert')).toContainText('Vergelijking niet beschikbaar');
  await expect(page.getByRole('button', { name: 'Geselecteerde publicatie herstellen' })).toBeDisabled();
});

test('English selection localizes the editing interface', async ({ page }) => {
  await setup(page);
  await page.getByRole('group', { name: /Taal|Language/i }).getByRole('button', { name: /^en$/i }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Page settings/ }).click();
  await page.getByRole('button', { name: 'media', exact: true }).click();
  await expect(page.getByLabel('Replace image')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear variant' })).toBeVisible();
});
