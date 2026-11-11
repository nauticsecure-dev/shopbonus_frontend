import { test, expect, type Page } from "@playwright/test";

// Cookie-authenticated initial reads require the CSRF cookie as well as the bootstrap response.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "XSRF-TOKEN", value: "consumer-fixture", url: baseURL! }]);
});

async function consumer(page: Page, locale: "nl" | "en", state: "available" | "missing" | "invalid" | "error" = "available") {
  await page.addInitScript(language => {
    localStorage.setItem("shopbonus-locale", language);
    localStorage.setItem("shopbonus-locale-explicit", "1");
  }, locale);
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", locale, roles: [], workspaces: [] };
    else if (path.endsWith("/wallet")) {
      if (state === "error") return route.fulfill({ status: 503, json: { message: "Wallet unavailable" } });
      data = { available_minor: 1234, reserved_minor: 100, pending_cashback_minor: 275, total_earned_minor: 1500, total_spent_minor: 266,
        balances: state === "missing" ? {} : { points: { unit: "points", available: state === "invalid" ? 12.5 : 321, reserved: 25, pending: 80, total_earned: 500, total_spent: 154 } } };
    } else if (path.endsWith("/transactions")) {
      const points = url.searchParams.get("unit") === "points";
      return route.fulfill({ json: { data: [{ id: "entry", title: "Voucher points purchase", amount: -45, amount_minor: -45, unit: points ? "points" : "eur_credit", sign: "debit", status: "posted", created_at: "2026-11-03T00:00:00Z" }], meta: { current_page: 1, last_page: 1, total: 1, per_page: 5 } } });
    } else if (path.endsWith("/dashboard")) data = { first_name: "Anna", vouchers: { issued: 0, expiring_within_30_days: 0 }, recent_vouchers: [], recent_activity: [{ id: "untyped", amount: 100, reason: "Unspecified wallet", at: null }], favorites: [], relevant_offers: [] };
    else if (path.endsWith("/public/offers/points-offer")) data = { slug: "points-offer", title: "Points offer", price_minor: null, price_points: 321, how_to_obtain: "buy_with_wallet", availability: "available", webshop: { slug: "fixture", name: "Fixture" } };
    return route.fulfill({ json: { data } });
  });
  return { recover: () => { state = "available"; } };
}

for (const locale of ["nl", "en"] as const) {
  test(`${locale}: benefits shows one EUR wallet and three navigation links`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await consumer(page, locale);
    await page.goto("/mijn-voordelen");
    const wallet = page.getByRole("region", { name: locale === "nl" ? "Mijn ShopBonus-tegoed" : "My ShopBonus credit", exact: true });
    await expect(wallet.getByText(locale === "nl" ? /€\s?12,34/ : /€12.34/)).toHaveCount(1);
    await expect(page.getByRole("region", { name: locale === "nl" ? "Mijn punten" : "My points", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: locale === "nl" ? "Recente activiteit" : "Recent activity", exact: true })).toHaveCount(0);
    await expect(page.locator("nav").filter({ has: page.getByRole("link", { name: locale === "nl" ? "Tegoedtransacties" : "Credit transactions", exact: true }) }).getByRole("link")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`wallet-${locale}-mobile.png`), fullPage: true });
  });
  test(`${locale}: points offer shows integer cost and opens checkout`, async ({ page }) => {
    await consumer(page, locale);
    await page.goto("/aanbiedingen/points-offer");
    await expect(page.getByText(locale === "nl" ? "321 punten" : "321 points", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: locale === "nl" ? "Inwisselen met punten" : "Redeem points", exact: true }).click();
    await expect(page).toHaveURL(/\/afrekenen\/points-offer$/);
  });
}

for (const state of ["missing", "invalid", "error"] as const) {
  test(`${state} points projection stays separate from the EUR balance`, async ({ page }) => {
    const fixture = await consumer(page, "en", state);
    await page.goto("/mijn-voordelen");
    const wallet = page.getByRole("region", { name: "My ShopBonus credit", exact: true });
    await expect(page.getByRole("region", { name: "My points", exact: true })).toHaveCount(0);
    if (state === "error") {
      await expect(wallet.getByText("Wallet unavailable", { exact: true })).toBeVisible();
      await expect(wallet.getByText(/€0.00/)).toHaveCount(0);
      fixture.recover();
      await Promise.any([
        wallet.getByRole("button", { name: "Retry", exact: true }).dispatchEvent("click", { timeout: 2000 }),
        wallet.getByText(/€12.34/).waitFor({ state: "visible" }),
      ]);
    }
    await expect(wallet.getByText(/€12.34/)).toBeVisible();
  });
}
