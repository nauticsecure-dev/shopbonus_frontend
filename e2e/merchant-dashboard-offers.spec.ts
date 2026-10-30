import { test, expect } from "@playwright/test";

/**
 * Smoke: merchant dashboard, offers and vouchers require a session.
 * Full offer/voucher flows need an authenticated approved workspace + Laravel.
 */
test.describe("Merchant dashboard, offers and vouchers", () => {
  test("unauthenticated visit redirects away from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  test("unauthenticated visit redirects away from offers", async ({ page }) => {
    await page.goto("/dashboard/offers");
    await expect(page).not.toHaveURL(/\/dashboard\/offers$/);
  });

  test("unauthenticated visit redirects away from vouchers", async ({ page }) => {
    await page.goto("/dashboard/vouchers");
    await expect(page).not.toHaveURL(/\/dashboard\/vouchers$/);
  });
});
