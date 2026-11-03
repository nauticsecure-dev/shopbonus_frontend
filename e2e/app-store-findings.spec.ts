import { test, expect, type Page } from "@playwright/test";

// Controlled API fixtures only; no provider/store acceptance is implied.
async function fixture(page: Page, locale = "en", syncStatus = "running", imported = 0, completeOnPoll = false) {
  const actions: string[] = [];
  let paused: string | null = null;
  const connection = () => ({ id: "connection", platform: "woocommerce", status: "limited", paused_at: paused, limitations: [], setup: { webhook_url: "https://api.example.test/webhook", steps: [] } });
  await page.context().addCookies([{ name: "XSRF-TOKEN", value: "synthetic-csrf", url: process.env.BASE_URL || "http://localhost:3000" }]);
  await page.addInitScript((locale) => { localStorage.setItem("shopbonus-locale", locale); localStorage.setItem("shopbonus-locale-explicit", "1"); }, locale);
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "owner", first_name: "Sanne", email: "owner@example.test", email_verified: true, status: "active", role: "merchant", onboarding_intent: "merchant", roles: [], destination: "workspace", two_factor_enabled: true, support_session: null, locale, workspaces: [{ id: "shop", name: "Synthetic Shop", status: "approved", role: "owner", is_current: true }] };
    else if (path.endsWith("/onboarding")) data = { webshop_status: "approved", next_step: null };
    else if (path.endsWith("/integrations/platforms")) data = [{ platform: "woocommerce", name: "WooCommerce", available: true, verification: "unverified", limitations: [], capabilities: {} }];
    else if (path.endsWith("/pause") || path.endsWith("/resume")) { actions.push(path); paused = path.endsWith("/pause") ? "2026-11-03T00:00:00Z" : null; data = connection(); }
    else if (path.endsWith("/connections")) data = [connection()];
    else if (path.endsWith("/connections/connection")) data = connection();
    else if (path.endsWith("/verify")) data = { checks: {}, missing_gates: ["native_api"], quality_gates: {}, next_action: "place_test_order" };
    else if (path.endsWith("/health")) data = null;
    else if (path.endsWith("/catalog-syncs") && completeOnPoll) data = [{ id: "fixture", status: "completed", items: 3, error_code: null }];
    else if (path.endsWith("/sync/products")) data = { run_id: "fixture", imported, exhausted: syncStatus === "partial", cursor: null, status: syncStatus, error_code: syncStatus === "failed" ? "provider_auth_failed" : null };
    await route.fulfill({ json: { data, meta: { current_page: 1, last_page: 1, total: 0 } } });
  });
  await page.goto("/dashboard/app-store");
  return actions;
}

test("static service availability does not display VERIFIED", async ({ page }) => {
  await fixture(page);
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Google Places", exact: true }).locator("..")).toContainText("SETUP REQUIRED");
  await expect(page.getByText("VERIFIED", { exact: true })).toHaveCount(0);
});

test("merchant pauses and resumes without disconnecting and catalog controls follow pause", async ({ page }) => {
  const actions = await fixture(page);
  await page.getByRole("button", { name: "Pause integration", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume integration", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync products", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Resume integration", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause integration", exact: true })).toBeVisible();
  expect(actions).toEqual(["/api/v1/workspaces/shop/connections/connection/pause", "/api/v1/workspaces/shop/connections/connection/resume"]);
});

for (const [state, label] of [["queued", "queued"], ["running", "processing"], ["partial", "partial"], ["completed", "empty"], ["failed", "failed"], ["unsupported", "unsupported"]]) {
  test(`zero rows with ${state} shows actual synchronization state`, async ({ page }) => {
    await fixture(page, "en", state);
    await page.getByRole("button", { name: "Sync products", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: `products: ${label}` })).toBeVisible();
    await expect(page.getByText(/may be UNSUPPORTED|often UNSUPPORTED/)).toHaveCount(0);
  });
}

test("Dutch App Store labels and pause actions use the selected locale", async ({ page }) => {
  await fixture(page, "nl");
  await expect(page.getByRole("button", { name: "Apps ontdekken", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Integratie pauzeren", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Producten synchroniseren", exact: true })).toBeVisible();
});

test("queued synchronization feedback advances using the actual run status", async ({ page }) => {
  await fixture(page, "en", "queued", 0, true);
  await page.getByRole("button", { name: "Sync products", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "products: completed · 3 imported" })).toBeVisible();
});
