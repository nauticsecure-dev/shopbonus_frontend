import { test, expect } from "@playwright/test";

// Cookie-authenticated initial reads require the CSRF cookie as well as the bootstrap response.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "XSRF-TOKEN", value: "consumer-fixture", url: baseURL! }]);
});

test("historical pending cashback remains visible and separate from available credit and checkout holds", async ({ page }) => {
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", onboarding_intent: "consumer", locale: "nl", roles: [], workspaces: [] };
    else if (path.endsWith("/wallet")) data = { available_minor: 1000, reserved_minor: 100, pending_cashback_minor: 275, pending_minor: 275, total_earned_minor: 1200, total_spent_minor: 200, currency: "EUR", unit: "eur_credit", updated_at: "2026-11-03T00:00:00Z" };
    else if (path.endsWith("/dashboard")) data = { first_name: "Anna", vouchers: { issued: 0, expiring_within_30_days: 0 }, recent_vouchers: [], recent_activity: [] };
    return route.fulfill({ json: { data } });
  });
  await page.goto("/mijn-voordelen");
  await expect(page.getByRole("heading", { name: "Mijn voordelen" })).toBeVisible();
  await expect(page.getByText(/€\s?2,75 cashback in behandeling/)).toBeVisible();
  await expect(page.getByText(/€\s?10,00 beschikbaar/)).toBeVisible();
  await expect(page.getByText(/€\s?1,00 gereserveerd/)).toBeVisible();
  await expect(page.getByText(/geen consumenten-pending saldo|cashback.*direct bijgeschreven/i)).toHaveCount(0);
});
