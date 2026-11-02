import { expect, test, type Page } from "@playwright/test";

const offer = { id: "offer-fixture", acquisition: "wallet_purchase", status: "draft", lifecycle_status: "draft", allowed_actions: ["edit", "import_codes"],
  terms: { name: "Historical discount", discount_type: "percentage", discount_value: 1000, min_order_minor: 5000, max_discount_minor: 1000, claim_validity_days: 90, redemption_validity_days: 90, combinable: false, summary: "10% discount", price_minor: 1250, price_points: 321, starts_at: "2027-01-01T10:00:00Z", ends_at: "2027-02-01T10:00:00Z", allocation_limit: 40, code_mode: "reusable" }, missing_for_activation: [], cost_preview: null, preview: null };
const counters = { total: 0, available: 0, reserved: 0, issued: 0, redeemed: 0, expired: 0, invalid: 0, cancelled: 0 };
const meta = { current_page: 1, last_page: 2, total: 26, per_page: 25 };

async function fixture(page: Page) {
  const state = { saved: null as Record<string, unknown> | null, redeemed: null as Record<string, unknown> | null, polls: 0, pollFailure: false, importFailed: false, disputePages: [] as string[], exportPolls: 0, dashboardPages: [] as string[], dashboardCalls: 0, claimQueries: [] as string[] };
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "nl"));
  await page.route("**/sanctum/csrf-cookie", r => r.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async r => {
    const request = r.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() === "OPTIONS") return r.fulfill({ status: 204 });
    let data: unknown = [];
    if (path.endsWith("/me")) data = { id: "merchant", first_name: "Sanne", email: "merchant@example.test", email_verified: true, status: "active", role: "merchant", roles: [], destination: "workspace", onboarding_intent: "merchant", locale: "nl", support_session: null, two_factor_enabled: false, workspaces: [{ id: "shop-fixture", name: "Fixture shop", status: "approved", role: "owner", is_current: true }] };
    else if (path.endsWith("/dashboard")) {
      state.dashboardCalls++; const pageNumber = Number(url.searchParams.get("page") || "1"); state.dashboardPages.push(String(pageNumber));
      data = { webshop: { id: "shop-fixture", name: "Fixture shop", status: "approved" }, greeting: "good_morning", kpis: { active_offers: 1, available_codes: 5, issued_vouchers: 3, claimed_vouchers: 2, redeemed_vouchers: 1, scheduled_offers: 0, paused_offers: 0, open_disputes: 0, reserved_codes: state.dashboardCalls, expired_vouchers: 2, expired_offers: 3 }, definitions: {}, connection_health: { status: "none", total: 0, connected: 0, attention: 0, last_error_at: null }, recent_activity: [], quick_actions: [], empty: false, offers: [{ id: "offer-"+pageNumber, name: "Offer page "+pageNumber, status: "draft", acquisition: "wallet_purchase", available_codes: 5, issued: 3, attention: [] }], offers_meta: { ...meta, current_page: pageNumber }, notifications: { unread: 0, latest: [] }, funding: { available_minor: 0, reserved_minor: 0 }, generated_at: new Date().toISOString() };
    }
    else if (path.endsWith("/analytics/claims")) {
      state.claimQueries.push(url.search); const previous = url.searchParams.has("from");
      data = { timezone: "Europe/Amsterdam", from: previous ? "2026-09-04" : "2026-10-04", to: previous ? "2026-10-03" : "2026-11-02", days: Array.from({ length: 30 }, (_, i) => ({ date: "2026-10-" + String(i+1).padStart(2,"0"), claims: 0, issued: 0, redeemed: 0 })), totals: { claims: previous ? 2 : 5, issued: previous ? 4 : 7, redeemed: 1 } };
    }
    else if (path.endsWith("/offers") && request.method() === "GET") data = [offer];
    else if (path.endsWith("/offers/offer-fixture") && request.method() === "PATCH") { state.saved = request.postDataJSON(); data = offer; }
    else if (path.endsWith("/codes")) return r.fulfill({ json: { data: [], meta: { ...meta, last_page: 1, total: 0, counters } } });
    else if (path.endsWith("/code-imports") || path.endsWith("/code-imports/batch-fixture/commit") || path.endsWith("/code-imports/batch-fixture")) {
      let status = path.endsWith("/code-imports") ? "preview" : "committing";
      if (path.endsWith("/code-imports/batch-fixture")) {
        state.polls++;
        if (state.pollFailure && state.polls === 1) return r.fulfill({ status: 500, json: { error: { message: "Fixture network failure" } } });
        status = state.importFailed ? "failed" : "committed";
      }
      data = { id: "batch-fixture", status, source: "paste", totals: { submitted: 2001, valid: 2001, invalid: 0, duplicate_in_upload: 0, duplicate_existing: 0, ...(status === "committed" ? { imported: 2001 } : {}) }, rejections: [] };
    }
    else if (path.endsWith("/vouchers/export")) return r.fulfill({ status: 202, json: { data: { id: "export-fixture", status: "queued", rows: 5000 } } });
    else if (path.endsWith("/vouchers/exports/export-fixture")) { state.exportPolls++; data = { id: "export-fixture", status: "ready", rows: 5000 }; }
    else if (path.endsWith("/vouchers/exports/export-fixture/download")) return r.fulfill({ contentType: "text/csv", body: "voucher,status\nfixture,issued\n" });
    else if (path.endsWith("/vouchers/redeem")) { state.redeemed = request.postDataJSON(); data = { voucher_id: state.redeemed?.voucher_id, status: "redeemed" }; }
    else if (path.endsWith("/vouchers")) return r.fulfill({ json: { data: [], meta } });
    else if (path.endsWith("/disputes")) {
      const pageNumber = url.searchParams.get("page") || "1"; state.disputePages.push(pageNumber);
      return r.fulfill({ json: { data: [{ id: "report-" + pageNumber, status: "open", reason: "code_invalid", description: "Report on page " + pageNumber, created_at: "2026-11-02T09:00:00Z", resolution: null }], meta: { ...meta, current_page: Number(pageNumber) } } });
    }
    else if (path.endsWith("/notifications")) return r.fulfill({ json: { data: [], meta: { unread: 0, unread_count: 0, total: 0 } } });
    return r.fulfill({ json: { data } });
  });
  return state;
}

test("mobile editor preserves supported settings and submits explicit clears", async ({ page }) => {
  const state = await fixture(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/offers"); await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await expect(page.getByLabel("Voucherprijs (€)")).toHaveValue("12.5");
  await expect(page.getByLabel("Puntenprijs")).toHaveValue("321");
  await expect(page.getByLabel("Totale uitgiftelimiet")).toHaveValue("40");
  await page.getByLabel("Voucherprijs (€)").fill("19.95"); await page.getByLabel("Puntenprijs").fill("450");
  await page.getByLabel("Start campagne").fill("2027-03-01T10:30"); await page.getByLabel("Einde campagne").fill("2027-04-01T10:30");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect.poll(() => state.saved).toMatchObject({ price_minor: 1995, price_points: 450, allocation_limit: 40, code_mode: "reusable" });
  expect(state.saved?.starts_at).toBe(new Date("2027-03-01T10:30").toISOString());
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await page.getByLabel("Start campagne").fill(""); await page.getByLabel("Einde campagne").fill(""); await page.getByLabel("Totale uitgiftelimiet").fill("");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect.poll(() => state.saved?.starts_at).toBeNull(); expect(state.saved?.ends_at).toBeNull(); expect(state.saved?.allocation_limit).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("queued import waits for completion and recovers status polling failure", async ({ page }) => {
  const state = await fixture(page); state.pollFailure = true;
  await page.goto("/dashboard/offers"); await page.getByRole("button", { name: "Codes plakken" }).click();
  await page.getByPlaceholder(/WOON10-AB12/).fill("FIXTURE-CODE"); await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Importeer 2001" }).click();
  await expect(page.getByText(/Codes worden verwerkt/)).toBeVisible();
  await expect(page.getByText("0 codes toegevoegd", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Status ophalen mislukt/ }).click();
  await expect(page.getByText("2001 codes toegevoegd", { exact: true })).toBeVisible(); expect(state.polls).toBe(2);
});

test("failed import exposes a fresh preview retry", async ({ page }) => {
  const state = await fixture(page); state.importFailed = true;
  await page.goto("/dashboard/offers"); await page.getByRole("button", { name: "Codes plakken" }).click();
  await page.getByPlaceholder(/WOON10-AB12/).fill("FIXTURE-CODE"); await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Importeer 2001" }).click();
  await expect(page.getByText(/Import mislukt. Controleer/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Importeer 2001" })).toBeDisabled();
  await page.getByRole("button", { name: "Terug", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preview", exact: true })).toBeVisible();
});

test("merchant redeems intended shared voucher, browses dispute pages and downloads queued export", async ({ page }) => {
  const state = await fixture(page); await page.goto("/dashboard/vouchers");
  await page.getByRole("button", { name: "Code inwisselen", exact: true }).click();
  await page.getByLabel("Code", { exact: true }).fill("SHARED-FIXTURE");
  await page.getByLabel(/Volledige voucherreferentie/).fill("01fixturevoucher00000000001");
  await page.getByRole("button", { name: "Inwisselen", exact: true }).click();
  await expect.poll(() => state.redeemed).toMatchObject({ code: "SHARED-FIXTURE", voucher_id: "01fixturevoucher00000000001" });
  await page.getByRole("button", { name: /Geschillen/, exact: false }).first().click();
  await expect(page.getByText("Report on page 1", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Paginering geschillen" }).getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByText("Report on page 2", { exact: true })).toBeVisible(); expect(state.disputePages).toContain("2");
  await page.getByRole("button", { name: "CSV exporteren" }).click();
  await expect(page.getByText(/Rapport wordt op de achtergrond/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Rapport gereed/ })).toBeVisible();
  const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: /Rapport gereed/ }).click();
  expect((await downloaded).suggestedFilename()).toBe("shopbonus-vouchers.csv");
});


test("dashboard shows stock summaries, compares adjacent periods, paginates and refreshes on focus", async ({ page }) => {
  const state = await fixture(page); await page.goto("/dashboard");
  await expect(page.getByRole("region", { name: "Voorraad en verval" })).toContainText("Gereserveerde codes 1");
  await expect(page.getByRole("region", { name: "Voorraad en verval" })).toContainText("Verlopen vouchers 2");
  await expect(page.getByText(/Vergelijking 2026-10-04/)).toBeVisible();
  expect(state.claimQueries.some(q => q.includes("from=2026-09-04&to=2026-10-03"))).toBe(true);
  await page.getByRole("navigation", { name: "Paginering aanbiedingen" }).getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByText("Offer page 2", { exact: true }).first()).toBeVisible();
  expect(state.dashboardPages).toContain("2");
  const before = state.dashboardCalls;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.dashboardCalls).toBeGreaterThan(before);
  await expect(page.getByRole("region", { name: "Voorraad en verval" })).toContainText("Gereserveerde codes " + state.dashboardCalls);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "docs/merchant-voucher-dashboard.png", fullPage: true });
});
