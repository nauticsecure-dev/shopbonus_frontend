import { test, expect } from "@playwright/test";

/**
 * Smoke: merchant Webshops workspace route renders the connection UX shell.
 * Full connector E2E requires an authenticated approved workspace + Laravel.
 */
test.describe("Webshops workspace UI", () => {
  test("unauthenticated visit redirects away from dashboard webshops", async ({ page }) => {
    await page.goto("/dashboard/webshops");
    await expect(page).not.toHaveURL(/\/dashboard\/webshops$/);
  });
});
