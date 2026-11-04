import { expect, test, type Page } from "@playwright/test";

// Browser contract regressions; API responses are controlled. Backend persistence
// and authorization are integration tests, not claimed as real-service E2E here.
async function setup(page: Page) {
  await page.context().addCookies([{ name: "XSRF-TOKEN", value: "merchant-overview-fixture", url: test.info().project.use.baseURL! }]);
  const state = { shop: "woon", fail: false, failChart: false, count: 8, requests: [] as string[] };
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "nl"));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/api/v1/me") return route.fulfill({ json: { data: {
      id: "owner", first_name: "Sanne", email: "merchant@example.test", email_verified: true, status: "active", role: "merchant",
      onboarding_intent: "merchant", roles: [], destination: "workspace", locale: "nl", two_factor_enabled: true, support_session: null,
      workspaces: ["woon", "fiets"].map((id) => ({ id, name: id === "woon" ? "Woon & Co" : "Fietsen Utrecht", status: "approved", role: "owner", is_current: id === state.shop })),
    } } });
    if (path.endsWith("/select")) { state.shop = path.split("/")[4]; return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith("/onboarding")) return route.fulfill({ json: { data: { webshop_status: "approved", next_step: null } } });
    if (path.endsWith("/dashboard")) {
      state.requests.push(url.pathname + url.search);
      if (state.fail) return route.fulfill({ status: 503, json: { message: "Dashboard tijdelijk niet beschikbaar" } });
      const id = path.split("/")[4];
      const p = Number(url.searchParams.get("page") ?? 1);
      return route.fulfill({ json: { data: {
        webshop: { id, name: id === "woon" ? "Woon & Co" : "Fietsen Utrecht", status: "approved" }, greeting: "good_morning",
        kpis: { active_offers: id === "woon" ? state.count : 3, available_codes: 24, reserved_codes: 1, expired_vouchers: 2, expired_offers: 1, issued_vouchers: 12, claimed_vouchers: 5, redeemed_vouchers: 2, scheduled_offers: 1, paused_offers: 1, open_disputes: 0 },
        connection_health: { status: "healthy", total: 1, connected: 1, attention: 0, last_error_at: null }, recent_activity: [], quick_actions: [], empty: false, definitions: {},
        offers: [{ id: `offer-${p}`, name: `${id} actie ${p}`, summary: "10% korting", type: "percentage", acquisition: "merchant_reward", min_order_minor: 10000, available_codes: 24, issued: 12, status: "active", lifecycle_status: url.searchParams.get("status") ?? "active", attention: [] }],
        offers_meta: { current_page: p, last_page: 2, per_page: 10, total: 11 }, notifications: { unread: 0, latest: [] }, funding: { available_minor: 10000, reserved_minor: 0 }, generated_at: new Date().toISOString(),
      } } });
    }
    if (path.endsWith("/analytics/claims")) {
      if (state.failChart) return route.fulfill({ status: 503, json: { message: "Grafiek tijdelijk niet beschikbaar" } });
      const n = Number(url.searchParams.get("days") ?? 30);
      return route.fulfill({ json: { data: { timezone: "Europe/Amsterdam", from: "2026-10-01", to: "2026-10-30", days: Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i % 30 + 1).padStart(2, "0")}`, claims: 1, issued: 2, redeemed: 0 })), totals: { claims: n, issued: n * 2, redeemed: 0 } } } });
    }
    if (path.endsWith("/vouchers")) {
      state.requests.push(url.pathname + url.search);
      return route.fulfill({ json: { data: [{ id: "voucher-1", status: "redeemed", origin: "answer24_claim", code: "****1234", offer_id: "offer-1", offer_name: "Geclaimde actie", issued_at: "2026-09-20T10:00:00Z", claimed_at: "2026-10-01T10:00:00Z", redeemed_at: "2026-10-02T10:00:00Z", expires_at: "2026-12-01T10:00:00Z", reserved_at: null }], meta: { current_page: 1, last_page: 1, total: 1, per_page: 25 } } });
    }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0, total: 0, current_page: 1, per_page: 20 } } });
  });
  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill({ status: 204 }));
  return state;
}

async function open(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByText("woon actie 1", { exact: true }).filter({ visible: true }).first()).toBeVisible();
}

test("overview has four primary cards and captures desktop layout", async ({ page }, info) => {
  await setup(page); await open(page);
  await expect(page.locator("main section").first().locator("a")).toHaveCount(4);
  await expect(page.getByText(/Automatisch elke 30 seconden/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("merchant-desktop.png"), fullPage: true });
});

test("offer pagination fetches later page and status change resets it", async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByText("woon actie 2", { exact: true }).first()).toBeVisible();
  expect(state.requests.some((r) => r.includes("page=2"))).toBeTruthy();
  await page.getByLabel("Filter aanbiedingen").selectOption("expired");
  await expect(page.getByText("Pagina 1 van 2", { exact: false })).toBeVisible();
  expect(state.requests.at(-1)).toContain("status=expired&page=1");
});

test("claimed KPI opens actual claimed voucher records", async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByRole("link", { name: /Geclaimde vouchers/ }).click();
  await expect(page).toHaveURL(/vouchers\?claimed=1/);
  await expect(page.getByText("Geclaimde actie", { exact: true }).first()).toBeVisible();
  expect(state.requests.at(-1)).toContain("claimed=1");
});

test("chart point opens the matching local claim date", async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.locator('svg[aria-label="Trendgrafiek"] circle').first().click();
  await expect(page).toHaveURL(/claimed=1&from=2026-10-01&to=2026-10-01/);
  await expect(page.getByText("Geclaimde actie", { exact: true }).first()).toBeVisible();
  expect(state.requests.at(-1)).toContain("from=2026-10-01&to=2026-10-01");
});

test("aggregate failure displays unavailable values and retry recovers", async ({ page }) => {
  const state = await setup(page); state.fail = true;
  await page.goto("/dashboard");
  await expect(page.getByText("Niet beschikbaar", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Meldingen niet beschikbaar.")).toBeVisible();
  await expect(page.getByText("Geen open meldingen.")).toHaveCount(0);
  state.fail = false;
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await expect(page.getByText("woon actie 1", { exact: true }).first()).toBeVisible();
});

test("chart failure remains independent from KPIs and retry recovers", async ({ page }) => {
  const state = await setup(page); state.failChart = true; await open(page);
  await expect(page.getByText("Grafiek tijdelijk niet beschikbaar")).toBeVisible();
  state.failChart = false; await page.getByRole("button", { name: "Opnieuw", exact: true }).click();
  await expect(page.getByRole("img", { name: "Trendgrafiek" })).toBeVisible();
});

test("switching workspace reloads isolated offers", async ({ page }) => {
  await setup(page); await open(page);
  await page.getByRole("button", { name: /Woon & Co/ }).click();
  await page.getByRole("button", { name: /Fietsen Utrecht/ }).click();
  await expect(page.getByText("fiets actie 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("woon actie 1", { exact: true })).toHaveCount(0);
});

test("polling updates counts from another session", async ({ page }) => {
  await page.clock.install();
  const state = await setup(page); await open(page);
  state.count = 17;
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("link", { name: /Actieve aanbiedingen/ })).toContainText("17");
});

test("chart period changes update heading and data", async ({ page }) => {
  await setup(page); await open(page);
  await page.getByRole("combobox").last().selectOption("7");
  await expect(page.getByText("Claims afgelopen 7 dagen", { exact: true })).toBeVisible();
  await expect(page.locator('svg[aria-label="Trendgrafiek"] circle')).toHaveCount(7);
});

test("mobile cards and pagination remain accessible", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page); await open(page);
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByText("woon actie 2", { exact: true }).last()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: info.outputPath("merchant-mobile.png"), fullPage: true });
});
