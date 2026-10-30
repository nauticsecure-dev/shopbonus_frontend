import { test, expect } from "@playwright/test";

/**
 * Smoke: merchant App Store route requires auth.
 * Full connector E2E needs approved workspace + provider credentials.
 */
test.describe("App Store workspace UI", () => {
  test("unauthenticated visit redirects away from dashboard app-store", async ({ page }) => {
    await page.goto("/dashboard/app-store");
    await expect(page).not.toHaveURL(/\/dashboard\/app-store$/);
  });

  test("legacy webshops path redirects when authenticated shell would load", async ({ page }) => {
    await page.goto("/dashboard/webshops");
    await expect(page).not.toHaveURL(/\/dashboard\/webshops$/);
  });
});
