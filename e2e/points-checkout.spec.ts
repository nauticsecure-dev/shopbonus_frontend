import { test, expect } from "@playwright/test";

// Cookie-authenticated initial reads require the CSRF cookie as well as the bootstrap response.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "XSRF-TOKEN", value: "consumer-fixture", url: baseURL! }]);
});

for (const locale of ["nl", "en"] as const) {
for (const mode of ["points", "shortfall", "dual"] as const) {
  test(`${locale}: ${mode} checkout selects the wallet without purchasing on view`, async ({ page }) => {
    await page.addInitScript(language => { localStorage.setItem("shopbonus-locale", language); localStorage.setItem("shopbonus-locale-explicit", "1"); }, locale);
    const requests: { path: string; body: Record<string, unknown> }[] = [];
    await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = {};
      if (path.endsWith("/me")) data = { id: "consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", onboarding_intent: "consumer", locale, roles: [], workspaces: [] };
      else if (path.endsWith("/public/offers/points-fixture")) data = { slug: "points-fixture", title: "Points voucher", how_to_obtain: "buy_with_wallet", price_minor: mode === "dual" ? 1000 : null, price_points: 321, availability: "available", webshop: { slug: "fixture", name: "Fixture" } };
      else if (path.endsWith("/checkouts/quote")) {
        const body = route.request().postDataJSON(); requests.push({ path, body });
        const points = body.wallet_unit === "points";
        data = { wallet_unit: body.wallet_unit, price_minor: points ? 0 : 1000, price_points: points ? 321 : null, wallet_available: 2000, wallet_part_minor: points ? 0 : 1000, wallet_available_points: mode === "shortfall" ? 20 : 400, wallet_part_points: mode === "shortfall" ? 20 : 321, shortfall_points: mode === "shortfall" ? 301 : 0, payment_part_minor: 0, shortfall_minor: 0, blockers: mode === "shortfall" ? ["insufficient_points"] : [] };
      } else if (path.endsWith("/checkouts")) {
        requests.push({ path, body: route.request().postDataJSON() });
        return route.fulfill({ status: 503, json: { error: { message: "Fixture timeout; retry safely" } } });
      } else if (path.includes("/vouchers") || path.endsWith("/notifications")) data = [];
      return route.fulfill({ json: { data } });
    });
    await page.goto("/afrekenen/points-fixture");
    await expect(page.getByRole("heading", { name: locale === "nl" ? "Voucher afrekenen" : "Voucher checkout" })).toBeVisible();
    if (mode === "dual") {
      await expect(page.getByLabel(locale === "nl" ? "Betalen met" : "Pay with")).toHaveValue("eur_credit");
      await page.getByLabel(locale === "nl" ? "Betalen met" : "Pay with").selectOption("points");
    }
    await expect(page.getByText(locale === "nl" ? "321 punten" : "321 points", { exact: true }).first()).toBeVisible();
    expect(requests.filter(r => !r.path.endsWith("/quote"))).toHaveLength(0);
    await page.getByRole("checkbox").check();
    const buy = page.getByRole("button", { name: locale === "nl" ? "Voucher ophalen" : "Get voucher" });
    if (mode === "shortfall") {
      await expect(buy).toBeDisabled();
      await expect(page.getByText(locale === "nl" ? "Je hebt onvoldoende beschikbare punten voor deze voucher." : "You do not have enough available points for this voucher.")).toBeVisible();
      await expect(page.getByText(locale === "nl" ? "301 punten" : "301 points", { exact: true })).toBeVisible();
    } else {
      await buy.click();
      await expect.poll(() => requests.filter(r => !r.path.endsWith("/quote")).length).toBe(1);
      expect(requests.at(-1)?.body).toMatchObject({ wallet_unit: "points", use_wallet: true });
    }
  });
}

}
