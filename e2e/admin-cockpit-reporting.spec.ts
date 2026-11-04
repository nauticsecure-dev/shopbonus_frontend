import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Browser contract tests reuse captured HTTP data. They do not prove provider integration.
const original = JSON.parse(readFileSync(path.resolve("e2e/fixtures/admin-cockpit.json"), "utf8"));

async function setup(page: Page) {
  const state = { requests: [] as string[], count: 2, degraded: false };
  await page.addInitScript(() => {
    localStorage.setItem("shopbonus-locale", "nl");
    document.cookie = "XSRF-TOKEN=cockpit-test; path=/";
  });
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
      Object.assign(summary.kpis, {
        orders: { received_in_period: 13, confirmed_paid_in_period: 11 },
        answer24: { requests_in_period: 7, by_status: { sent: 5, failed: 2 } },
        vouchers: { issued_in_period: 8, redeemed_in_period: 3, available_codes: 19, outstanding: 6 },
        wallets: { points: { issued_in_period: 1200, spent_in_period: 400, expired_in_period: 10, outstanding: 900, available: 800, reserved: 100, pending: 200 } },
        disputes: { open: 4 },
      });
      if (state.degraded) summary.warnings.push({ code: "kpis_degraded", message: "Unavailable" });
      return route.fulfill({ json: { data: summary } });
    }
    if (url.pathname === "/api/v1/admin/vouchers") return route.fulfill({ json: { data: [{ id: "voucher-evidence", status: "issued", issued_at: "2026-10-31T12:00:00Z" }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 25 } } });
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
  expect(state.requests.some((r) => r.includes("/admin/vouchers?") && new URL(r, "http://localhost").searchParams.get("usable") === "1")).toBeTruthy();
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



test("Today and complete business metrics use the server response", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/admin");
  await expect(page.getByRole("region", { name: "Orders", exact: true })).toContainText("11");
  await expect(page.getByRole("region", { name: "Answer24", exact: true })).toContainText("sent5");
  await expect(page.getByRole("region", { name: "Vouchervoorraad", exact: true })).toContainText("19");
  await expect(page.getByRole("region", { name: "Punten", exact: true })).toContainText("1.200");
  await expect(page.getByRole("region", { name: "Punten", exact: true })).toContainText("400");
  await expect(page.getByRole("region", { name: "Geschillen", exact: true })).toContainText("4");
  await page.locator("select").first().selectOption("today");
  await expect.poll(() => state.requests.some((r) => r.includes("period=today"))).toBeTruthy();
});

test("degraded business metrics are unavailable instead of zero", async ({ page }) => {
  const state = await setup(page);
  state.degraded = true;
  await page.goto("/admin");
  await expect(page.getByRole("region", { name: "Orders", exact: true })).toContainText("Niet beschikbaar");
  await expect(page.getByRole("region", { name: "Punten", exact: true })).toContainText("Niet beschikbaar");
});

for (const list of ["users", "webshops", "vouchers", "activity"]) {
  test(list + " pagination retains filters and reaches later records", async ({ page }) => {
    const state = await setup(page);
    const webshop = "01K9ADZG000000000000000001";
    await page.route("**/api/v1/admin/" + list + "?*", async (route) => {
      const url = new URL(route.request().url());
      state.requests.push(url.pathname + url.search);
      const current = Number(url.searchParams.get("page") || 1);
      const row = list === "activity" ? { id: "event-" + current, occurred_at: "2026-11-03T12:00:00Z", type: "Webshop", description: "record-" + current, detail: "test", href: null } : { id: "record-" + current, first_name: "record-" + current, name: "record-" + current, status: "active" };
      await route.fulfill({ json: { data: [row], meta: { current_page: current, last_page: 2, total: 26, per_page: 25 } } });
    });
    const filters = list === "webshops" ? "status=approved&search=sample" : "webshop=" + webshop + "&status=issued&from=2026-10-01&category=voucher";
    await page.goto("/admin/" + list + "?" + filters);
    await expect(page.getByRole("button", { name: "Vorige", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
    await expect(page.getByText(list === "activity" ? "Webshop: record-2" : "record-2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Volgende", exact: true })).toBeDisabled();
    await expect(page).toHaveURL(/page=2/);
    const request = state.requests.findLast((r) => r.includes("/admin/" + list + "?") && r.includes("page=2"));
    expect(request).toBeTruthy();
    if (list !== "webshops") expect(request).toContain("webshop_id=" + webshop);
    if (list === "vouchers") expect(request).toContain("from=2026-10-01");
    if (list === "activity") expect(request).toContain("category=voucher");
    await page.getByRole("button", { name: "Vorige", exact: true }).click();
    await expect(page.getByText(list === "activity" ? "Webshop: record-1" : "record-1", { exact: true })).toBeVisible();
  });
}
