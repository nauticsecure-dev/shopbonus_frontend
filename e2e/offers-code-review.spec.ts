import { test, expect, type Page } from "@playwright/test";

// Controlled UI contracts; provider checkout acceptance is separate release evidence.
async function setup(page: Page) {
  const state = { inventory: [] as URL[], exports: [] as URL[], checks: [] as Record<string, unknown>[], invalidated: [] as string[] };
  const codes = ["ok", "denied", "conflict", "server", "network"].map((id) => ({
    id, code: `****${id}`, status: "available", platform_validation: "verification_pending", batch_id: "new-batch",
    assigned: id === "ok" ? { voucher_id: "historic-voucher", origin: "answer24_claim", voucher_status: "issued", consumer: null } : null,
    created_at: "2026-11-03T10:00:00Z", reusable: false, uses_count: 0,
  }));
  await page.addInitScript(() => {
    localStorage.setItem("shopbonus-locale", "nl");
    localStorage.setItem("shopbonus-locale-explicit", "1");
  });
  await page.context().addCookies([{ name: "XSRF-TOKEN", value: "fixture", domain: "127.0.0.1", path: "/" }]);
  await page.route("**/sanctum/csrf-cookie", (r) => r.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path.endsWith("/me")) return route.fulfill({ json: { data: {
      id: "owner", first_name: "Sanne", email: "owner@example.test", email_verified: true, status: "active", role: "merchant", onboarding_intent: "merchant", roles: [], destination: "workspace", locale: "nl", two_factor_enabled: false, support_session: null,
      workspaces: [{ id: "shop", name: "Workspace", status: "approved", role: "owner", is_current: true }],
    } } });
    if (path.endsWith("/workspaces/shop")) return route.fulfill({ json: { data: { membership: { role: "owner", permissions: ["vouchers.view", "vouchers.manage", "vouchers.export"] } } } });
    if (path.endsWith("/offers")) return route.fulfill({ json: { data: [{
      id: "offer", status: "active", acquisition: "merchant_reward", lifecycle_status: "active", allowed_actions: ["edit", "import_codes", "pause"],
      terms: { name: "Review offer", version: 1, discount_type: "percentage", discount_value: 1000, min_order_minor: 10000, max_discount_minor: 1000, claim_validity_days: 90, redemption_validity_days: 90, currency: "EUR" },
    }] } });
    if (path.endsWith("/code-batches")) return route.fulfill({ json: {
      data: [{ id: url.searchParams.get("page") === "2" ? "older-batch" : "new-batch" }], meta: { last_page: 2 },
    } });
    if (path.endsWith("/codes/export")) {
      state.exports.push(url);
      return route.fulfill({ contentType: "text/csv", body: "code,status\nSYNTHETIC,available\n" });
    }
    if (path.endsWith("/codes")) {
      state.inventory.push(url);
      return route.fulfill({ json: { data: codes, meta: { counters: { total: 5, available: 5, reserved: 0, issued: 0, redeemed: 0, expired: 0, invalid: 0, cancelled: 0 }, current_page: 1, last_page: 1, total: 5, from: 1, to: 5 } } });
    }
    if (path.endsWith("/platform-validation")) {
      const body = route.request().postDataJSON(); state.checks.push(body);
      return route.fulfill({ json: { data: codes[0], verification: { platform_validation: body.mode === "manual_confirm" ? "manually_confirmed" : "verified", detail: { reason: "synthetic_contract_test" } } } });
    }
    if (path.endsWith("/invalidate")) {
      const id = path.split("/").at(-2)!; state.invalidated.push(id);
      if (id === "network") return route.abort("internetdisconnected");
      const status = id === "denied" ? 403 : id === "conflict" ? 409 : id === "server" ? 500 : 200;
      return route.fulfill({ status, json: status === 200 ? { data: codes[0] } : { error: { code: "fixture_error", message: "Fixture failure" } } });
    }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto("/dashboard/offers");
  await expect(page.getByText("****ok", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  return state;
}

test("older batches, dates, sorting and filtered export use the same scope", async ({ page }) => {
  const state = await setup(page);
  const batch = page.locator("select").filter({ has: page.locator('option[value="older-batch"]') });
  await batch.selectOption("older-batch");
  await page.getByLabel("Toegevoegd vanaf", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Toegevoegd tot en met").fill("2026-10-31");
  await page.getByLabel("Sorteer codes").selectOption("status");
  await page.getByLabel("Zoek volledige code (exact)").fill("EXACT-CODE");
  await expect.poll(() => state.inventory.at(-1)?.searchParams.get("search")).toBe("EXACT-CODE");
  await page.getByRole("checkbox", { name: "Selecteer zichtbare codes" }).check();
  await page.getByRole("button", { name: "Gefilterde voorraad exporteren" }).click();
  await expect.poll(() => state.exports.length).toBe(1);
  const inventory = state.inventory.at(-1)!.searchParams, exported = state.exports[0].searchParams;
  for (const key of ["batch", "sort", "search", "added_from", "added_to"]) expect(exported.get(key)).toBe(inventory.get(key));
  expect(exported.has("ids")).toBe(false);
  expect(exported.get("added_to")).toContain("59.999Z");
});

test("bulk failures retain selections and report distinct causes", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("checkbox", { name: "Selecteer zichtbare codes" }).check();
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Synthetic reason" : undefined));
  await page.getByRole("button", { name: "Maak 5 ongeldig" }).click();
  await expect(page.getByRole("button", { name: "Maak 4 ongeldig" })).toBeVisible();
  expect(state.invalidated).toHaveLength(5);
  await expect(page.getByRole("checkbox", { name: "Selecteer ****ok", exact: true }).first()).not.toBeChecked();
  for (const id of ["denied", "conflict", "server", "network"]) await expect(page.getByRole("checkbox", { name: `Selecteer ****${id}`, exact: true }).first()).toBeChecked();
  await expect(page.getByText(/Geen rechten: 1/)).toBeVisible();
  await expect(page.getByText(/Statusconflict: alleen beschikbare codes: 1/)).toBeVisible();
  await expect(page.getByText(/Serverfout: 1/)).toBeVisible();
  await expect(page.getByText(/Netwerkfout: controleer de verbinding: 1/)).toBeVisible();
});

test("mobile voucher checks send historical reference and manual evidence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await page.getByRole("button", { name: "Vouchercheck", exact: true }).last().click();
  await expect.poll(() => state.checks.length).toBe(1);
  expect(state.checks[0]).toEqual({ mode: "provider_check", voucher_id: "historic-voucher" });
  page.on("dialog", (d) => d.accept("Synthetic merchant checkout evidence"));
  await page.getByRole("button", { name: "Handmatig", exact: true }).first().click();
  await expect.poll(() => state.checks.length).toBe(2);
  expect(state.checks[1]).toEqual({ mode: "manual_confirm", voucher_id: "historic-voucher", note: "Synthetic merchant checkout evidence" });
  await expect(page.getByText(/Historische voucher: Handmatig bevestigd/)).toBeVisible();
});
