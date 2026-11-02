import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Browser contract tests reuse captured HTTP data. They do not prove provider integration.
const original = JSON.parse(readFileSync(path.resolve("e2e/fixtures/admin-cockpit.json"), "utf8"));

async function setup(page: Page) {
  const state = { requests: [] as string[], count: 2 };
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "nl"));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    state.requests.push(url.pathname + url.search);
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/v1/me") return route.fulfill({ json: { data: {
      id: "admin", first_name: "Admin", email: "admin@example.test", email_verified: true,
      status: "active", role: "super_admin", roles: ["super_admin"], destination: "admin",
      onboarding_intent: "merchant", workspaces: [], locale: "nl", two_factor_enabled: true, support_session: null,
    } } });
    if (url.pathname === "/api/v1/admin/cockpit") {
      const summary = structuredClone(original);
      summary.cards.find((c: { key: string }) => c.key === "active_vouchers").display = String(state.count);
      return route.fulfill({ json: { data: summary } });
    }
    if (url.pathname === "/api/v1/admin/vouchers") return route.fulfill({ json: { data: [{ id: "voucher-evidence", status: "issued", issued_at: "2026-10-31T12:00:00Z" }], meta: { total: 1 } } });
    return route.fulfill({ json: { data: [], totals: {}, meta: { total: 0, unread_count: 0, current_page: 1, last_page: 1 } } });
  });
  return state;
}

test("custom range validates dates and sends both boundaries", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin");
  await expect(page.getByText("Verdeling affiliatekanalen")).toBeVisible();
  await page.locator("select").first().selectOption("custom");
  await page.getByLabel("Van", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Tot", { exact: true }).fill("2026-10-15");
  await expect.poll(() => state.requests.some((r) => r.includes("period=custom&from=2026-10-01&to=2026-10-15"))).toBeTruthy();
  await page.getByLabel("Tot", { exact: true }).fill("2026-09-01");
  await expect(page.getByRole("alert").filter({ hasText: "geldige" })).toContainText("geldige");
  await expect(page.getByText("Actuele totalen hebben geen historische vergelijking.", { exact: false })).toBeVisible();
});

test("donut opens vouchers tab with acquisition source and reporting dates", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin");
  const href = original.affiliate_channels.channels.find((c: { network: string }) => c.network === "daisycon").href;
  await page.locator(`a[href="${href}"]`).click();
  await expect(page).toHaveURL(/tab=vouchers.*network=daisycon.*from=.*to=/);
  await expect(page.getByText("voucher-evidence")).toBeVisible();
  await expect.poll(() => state.requests.some((r) => r.includes("/admin/vouchers?") && r.includes("acquisition_network=daisycon") && r.includes("from=") && r.includes("to="))).toBeTruthy();
  await page.getByRole("button", { name: "Conversies", exact: true }).click();
  await expect(page).toHaveURL(/tab=transactions.*network=daisycon.*from=.*to=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/admin$/);
});

test("commission deep link opens transactions and passes date and status filters", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin/affiliate?tab=transactions&status=approved&network=daisycon&from=2026-10-01&to=2026-10-15");
  await expect(page.getByText("Resolve note", { exact: true })).toBeVisible();
  await expect.poll(() => state.requests.some((r) => r.includes("/affiliate/transactions?") && r.includes("status=approved") && r.includes("from=2026-10-01") && r.includes("to=2026-10-15"))).toBeTruthy();
});

test("usable voucher card preserves its authoritative list filter", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin");
  await page.locator('a[href="/admin/vouchers?usable=1"]').click();
  await expect(page.getByText("voucher-evidence")).toBeVisible();
  expect(state.requests.some((r) => r.includes("/admin/vouchers?usable=1"))).toBeTruthy();
});

test("visible cockpit refreshes automatically and updates current totals", async ({ page }) => {
  await page.clock.install();
  const state = await setup(page);
  await page.goto("/admin");
  const card = page.locator('a[href="/admin/vouchers?usable=1"]');
  await expect(card).toContainText("2");
  const before = state.requests.filter((r) => r.includes("/admin/cockpit?")).length;
  state.count = 7;
  await page.clock.fastForward(60001);
  await expect(card).toContainText("7");
  expect(state.requests.filter((r) => r.includes("/admin/cockpit?")).length).toBeGreaterThan(before);
});

