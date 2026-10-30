/**
 * Card #5 / B15 acceptance: locale, CMS draft isolation, preview auth,
 * FAQ, cookie lifecycle (frontend). Backend PHPUnit covers publish/cache,
 * concurrency, tenant isolation, XSS, and consent API (CmsTest + CookieConsentTest).
 *
 * npx playwright test e2e/cms-i18n-consent.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";
const api = process.env.API_BASE_URL || "http://localhost:8000";

test.describe("B15 multilingual CMS & cookie consent", () => {
  test("E2E1 locale consistency: NL↔EN chrome without mixed labels", async ({ page }) => {
    await page.goto(`${base}/`);
    await expect(page.getByTestId("site-header")).toBeVisible();

    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: /Webshops/i })).toBeVisible();

    await page.getByRole("group", { name: /Taal|Language/i }).getByRole("button", { name: /^en$/i }).click();
    await expect(page.getByTestId("header-login")).toContainText(/Log in/i);
    await expect(page.getByTestId("header-register")).toContainText(/Register/i);
    // No Dutch register CTA while EN is selected.
    await expect(page.getByTestId("header-register")).not.toContainText(/Account aanmaken/i);

    await page.getByRole("group", { name: /Taal|Language/i }).getByRole("button", { name: /^nl$/i }).click();
    await expect(page.getByTestId("header-login")).toContainText(/Inloggen/i);

    // Preference persists across reload.
    await page.reload();
    await expect(page.getByTestId("header-login")).toContainText(/Inloggen/i);
  });

  test("E2E2 draft isolation: public page unchanged by anonymous visit after studio exists", async ({
    page,
    request,
  }) => {
    // Public pages API never returns drafts (backend CmsTest E2E2). Smoke the route.
    const res = await request.get(`${api}/api/v1/public/pages?locale=nl`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();

    await page.goto(`${base}/faq`);
    await expect(page.getByTestId("faq-page")).toBeVisible();
    // Guests never see inline CMS chrome on FAQ.
    await expect(page.getByTestId("cms-edit-page")).toHaveCount(0);
  });

  test("E2E3 preview authorization: admin preview endpoints are private", async ({ request }) => {
    const res = await request.get(`${api}/api/v1/admin/cms/pages`);
    expect([401, 403]).toContain(res.status());

    const preview = await request.get(
      `${api}/api/v1/admin/cms/pages/00000000-0000-0000-0000-000000000000/locales/nl/preview`
    );
    expect([401, 403, 404]).toContain(preview.status());
  });

  test("E2E6 FAQ public search UI", async ({ page }) => {
    await page.goto(`${base}/faq`);
    await expect(page.getByTestId("faq-page")).toBeVisible();
    await page.getByTestId("faq-search").fill("zzzz-no-match-xyz");
    await page.getByTestId("faq-search").press("Enter");
    await expect(page.getByText(/Geen vragen gevonden|No questions found/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("E2E7 auth isolation: CMS mutations blocked for anonymous", async ({ request }) => {
    const create = await request.post(`${api}/api/v1/admin/cms/pages`, {
      data: {
        key: "hack",
        type: "info",
        locales: { nl: { slug: "hack", content: { title: "x", body: { type: "doc", content: [] } } } },
      },
    });
    expect([401, 403, 419, 422]).toContain(create.status());
  });

  test("E2E8 XSS payloads rejected on public cookie consent customize", async ({ request }) => {
    const policy = await request.get(`${api}/api/v1/public/cookie-policy?locale=nl`);
    expect(policy.ok()).toBeTruthy();
    const version = (await policy.json()).data?.version;
    if (!version) {
      test.skip();
      return;
    }
    const res = await request.post(`${api}/api/v1/public/cookie-consents`, {
      data: {
        policy_version: version,
        action: "customize",
        choices: { analytics: true },
        // Extra fields must not create script injection vectors in storage.
        "evil<script>": "<img src=x onerror=alert(1)>",
      },
    });
    expect([201, 409, 422]).toContain(res.status());
    if (res.status() === 201) {
      const json = await res.json();
      expect(JSON.stringify(json)).not.toMatch(/<script|onerror=/i);
    }
  });

  test("E2E9 cookie lifecycle UI: settings reopen banner", async ({ page }) => {
    await page.goto(`${base}/`);
    // Footer cookie settings always available.
    const settings = page.getByTestId("footer-cookie-settings");
    await expect(settings).toBeVisible();
    await settings.click();
    // Banner may already be open from first visit, or reopen via event.
    await expect(page.getByTestId("cookie-consent-banner").or(page.getByRole("dialog"))).toBeVisible({
      timeout: 5_000,
    });
  });

  test("E2E10 Content Studio route exists for Super Admin gate", async ({ page }) => {
    await page.goto(`${base}/admin/cms`);
    // Unauthenticated users are redirected to account login.
    await expect(page).toHaveURL(/account/, { timeout: 15_000 });
  });
});
