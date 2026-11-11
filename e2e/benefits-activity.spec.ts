import { test, expect, type Page } from "@playwright/test";

// Cookie-authenticated initial reads require the CSRF cookie as well as the bootstrap response.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "XSRF-TOKEN", value: "consumer-fixture", url: baseURL! }]);
});

async function mockConsumer(page: Page, locale: "nl" | "en") {
  await page.addInitScript((language) => {
    localStorage.setItem("shopbonus-locale", language);
    localStorage.setItem("shopbonus-locale-explicit", "1");
  }, locale);
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", onboarding_intent: "consumer", locale, roles: [], workspaces: [] };
    if (path.endsWith("/wallet")) data = { available_minor: 1000, reserved_minor: 100, pending_cashback_minor: 275, total_earned_minor: 1200, total_spent_minor: 200, currency: "EUR", unit: "eur_credit", updated_at: "2026-11-03T00:00:00Z" };
    return route.fulfill({ json: { data } });
  });
}

const activity = [{ id: "reward-1", type: "credit", reason: "Cashback", amount: 250, at: "2026-10-12T12:00:00Z" }];
const dashboard = (rows = activity) => ({ first_name: "Anna", vouchers: { issued: 0, expiring_within_30_days: 0 }, recent_vouchers: [], recent_activity: rows, relevant_offers: [{ slug: "offer", title: "Test offer" }] });

for (const locale of ["nl", "en"] as const) {
  test(`${locale}: failed dashboard leaves one usable wallet and one empty-state CTA`, async ({ page }) => {
    await mockConsumer(page, locale);
    await page.route("**/api/v1/consumer/dashboard", route => route.fulfill({ status: 503, json: { message: "Unavailable" } }));
    await page.goto("/mijn-voordelen");
    const wallet = page.getByRole("region", { name: locale === "nl" ? "Mijn ShopBonus-tegoed" : "My ShopBonus credit", exact: true });
    await expect(wallet.getByText(locale === "nl" ? /€\s?10,00/ : /€10.00/)).toBeVisible();
    await expect(page.getByRole("heading", { name: locale === "nl" ? "Recente activiteit" : "Recent activity", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: locale === "nl" ? "Ontdek webshops" : "Discover shops", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: locale === "nl" ? "Profiel" : "Profile", exact: true })).toHaveCount(0);
  });
  test(`${locale}: voucher details and transaction history on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockConsumer(page, locale);
    const voucher = { id: "v1", voucher_id: "REF-1", status: "ACTIVE", code_masked: "TEST-****", can_copy_code: false, can_report_problem: true, webshop: { name: "Test shop", slug: "test", logo_url: null, categories: [] }, merchant_name: "Test shop", title: "Test voucher", discount_type: "percentage", discount_value: 12.5, minimum_order_minor: 1000, maximum_discount_minor: 500, issued_at: "2026-10-12T12:00:00Z", expires_at: "2026-12-12T12:00:00Z", days_left: 39 };
    await page.route("**/api/v1/consumer/dashboard", route => route.fulfill({ json: { data: dashboard() } }));
    await page.route(/\/api\/v1\/consumer\/vouchers(?:\?.*)?$/, route => route.fulfill({ json: { data: [voucher] } }));
    await page.route("**/api/v1/consumer/vouchers/v1", route => route.fulfill({ json: { data: voucher } }));
    await page.route("**/api/v1/consumer/wallet/transactions?*", route => route.fulfill({ json: { data: [{ id: "t1", title: "Cashback", subtitle: "Test shop", type: "credit", status: "posted", sign: "credit", amount: 250, unit: "eur_credit", available_after: 1000, amount_minor: 250, created_at: "2026-10-12T12:00:00Z" }], meta: { total: 1, current_page: 1, last_page: 1 } } }));
    await page.goto("/mijn-voordelen");
    await page.getByRole("button", { name: locale === "nl" ? "Bekijk details" : "View details", exact: true }).click();
    await expect(page.getByText(locale === "nl" ? "Uitgegeven" : "Issued", { exact: true })).toBeVisible();
    await expect(page.getByText(locale === "nl" ? "12 okt 2026" : "12 Oct 2026", { exact: true }).last()).toBeVisible();
    await page.getByRole("button", { name: locale === "nl" ? "Sluiten" : "Close", exact: true }).last().click();
    await page.getByRole("link", { name: locale === "nl" ? "Tegoedtransacties" : "Credit transactions", exact: true }).click();
    await expect(page.getByRole("heading", { name: locale === "nl" ? "Alle transacties" : "All transactions", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cashback Test shop/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
