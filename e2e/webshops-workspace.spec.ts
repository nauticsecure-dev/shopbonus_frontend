import { test, expect } from "@playwright/test";

/**
 * Legacy Webshops path redirects to App Store (auth required either way).
 */
test.describe("Webshops workspace UI", () => {
  test("unauthenticated visit redirects away from dashboard webshops", async ({ page }) => {
    await page.goto("/dashboard/webshops");
    await expect(page).not.toHaveURL(/\/dashboard\/webshops$/);
  });
});
