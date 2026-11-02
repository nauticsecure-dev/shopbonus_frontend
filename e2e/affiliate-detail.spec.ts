import { expect, test, type Page } from "@playwright/test";

async function fixture(page: Page, en = false, signedIn = true) {
  await page.addInitScript(({ en }) => localStorage.setItem("shopbonus-locale", en ? "en" : "nl"), { en });
  let claims = 0;
  await page.route("**/sanctum/csrf-cookie", r => r.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async r => {
    const path = new URL(r.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) {
      if (!signedIn) return r.fulfill({ status: 401, json: { error: { message: "Authentication required" } } });
      data = { id: "fixture-consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", onboarding_intent: "consumer", locale: en ? "en" : "nl", roles: [], workspaces: [], two_factor_enabled: false, support_session: null };
    } else if (path.endsWith("/public/webshops/woon-co")) {
      data = { slug: "woon-co", name: "Woon & Co", short_description: "Home accessories", description: "Home accessories and gifts.", logo_url: null, cover_url: null, website_url: "https://example.test", categories: [{ key: "home", label: { nl: "Wonen", en: "Home" } }], cashback_label: "Tot 7% cashback", offers: [
        { slug: null, title: "7% cashback", offer_kind: "cashback", cta_hint: "shop_and_earn", cashback_label: "7% cashback", availability: "available", how_to_obtain: "earn_cashback" },
        { slug: "save10", title: "10% kortingscode", offer_kind: "combined", cta_hint: "claim_both", cashback_label: "7% cashback", discount_type: "percentage", discount_value: 1000, availability: "available", how_to_obtain: "claim", ends_at: "2026-12-31T00:00:00Z" },
        { slug: "soldout", title: "20% kortingscode", offer_kind: "discount_code", discount_type: "percentage", discount_value: 2000, availability: "sold_out", how_to_obtain: "claim" },
      ] };
    } else if (path.endsWith("/consumer/offers/save10/claim")) {
      claims++;
      data = { id: "voucher-1", status: "issued" };
    } else if (path.endsWith("/consumer/vouchers/voucher-1")) {
      data = { code: "FIXTURE-SAVE10", can_copy_code: true };
    }
    return r.fulfill({ json: { data } });
  });
  return { claims: () => claims };
}

test("Dutch detail reveals inline, preserves tracked shop link and disables sold-out code", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/webshops/woon-co");
  await expect(page.getByRole("heading", { name: "Woon & Co", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pak beide voordelen" }).click();
  await expect(page.getByText("FIXTURE-SAVE10", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop met deze code" })).toHaveAttribute("href", /\/public\/webshops\/woon-co\/visit/);
  expect(state.claims()).toBe(1);
  await expect(page.getByRole("button", { name: "Niet beschikbaar", exact: true })).toBeDisabled();
  await expect(page.getByText(/officiële website registreert geen cashback/)).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "docs/affiliate-detail-desktop.png", fullPage: true });
});

test("English mobile detail translates labels and dates without horizontal overflow", async ({ page }) => {
  await fixture(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/webshops/woon-co");
  await expect(page.getByRole("button", { name: "Get both benefits" })).toBeVisible();
  await expect(page.getByText("Valid until 31/12/2026")).toBeVisible();
  await expect(page.getByText("Home", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Get both benefits" }).click();
  await expect(page.getByRole("link", { name: "Shop with this code" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "docs/affiliate-detail-mobile-en.png", fullPage: true });
});

test("guest reveal requests sign-in without claiming inventory", async ({ page }) => {
  const state = await fixture(page, false, false);
  await page.goto("/webshops/woon-co");
  await page.getByRole("button", { name: "Pak beide voordelen" }).click();
  await expect(page).toHaveURL(/\/account\?.*next=%2Fwebshops%2Fwoon-co/);
  expect(state.claims()).toBe(0);
});
