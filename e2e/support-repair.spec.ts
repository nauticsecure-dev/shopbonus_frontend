import { expect, test, type Page } from "@playwright/test";
// Controlled HTTP browser regressions. These do not prove real provider/Reverb availability.
const conversation = "01j00000000000000000000001";
const messageId = "01j00000000000000000000002";
async function setup(page: Page, locale = "en") {
  await page.context().addCookies([{ name: "XSRF-TOKEN", value: "support-repair-fixture", url: test.info().project.use.baseURL! }]);
  const state = { admin: false, merchant: false, wallet: "ready", available: 1000, reserved: 500, status: "PENDING", reply: false, display: true, detailReads: 0 };
  await page.addInitScript((value) => localStorage.setItem("shopbonus-locale", value), locale);
  const message = () => ({ id: messageId, conversation_id: conversation, question: "Where is my reward FS-20482?", status: state.status, result: state.status === "VERIFIED" ? { answer: "Available ShopBonus credit: EUR 10.00; reserved: EUR 5.00.", action: { label: "View my credit", route: "/app/wallet" } } : null, display: { show_progress_updates: state.display, show_verified_badge: state.display }, created_at: "2026-10-31T08:00:00Z" });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/api/v1/me") return route.fulfill({ json: { data: { id: "consumer", first_name: "Test", email: "support@example.test", email_verified: true, status: "active", role: state.merchant ? "merchant" : "consumer", onboarding_intent: state.merchant ? "merchant" : "consumer", roles: state.admin ? ["super_admin"] : [], destination: state.merchant ? "workspace" : "consumer", locale, workspaces: state.merchant ? [{ id: "01j00000000000000000000008", name: "Own workspace", status: "approved", role: "owner", is_current: true }] : [], two_factor_enabled: false, support_session: null } } });
    if (path === "/api/v1/me/wallet") {
      if (state.wallet === "loading") await new Promise((resolve) => setTimeout(resolve, 2000));
      if (state.wallet === "error") return route.fulfill({ status: 503, json: { message: "Unavailable" } });
      return route.fulfill({ json: { data: { available_minor: state.available, reserved_minor: state.reserved, currency: "EUR", unit: "EUR_REDEMPTION_CREDIT", total_earned_minor: 1000, total_spent_minor: 0, updated_at: "2026-10-31T08:00:00Z" } } });
    }
    if (path === "/api/v1/admin/platform-settings") return route.fulfill({ json: { data: [], published: { values: {}, versions: {} }, allowed_keys: ["support.ai"] } });
    if (path === "/api/v1/admin/ai/operations") return route.fulfill({ json: { data: { sample_size: 0, matching_total: 0, statuses: {}, failures: {}, retrieval_retries: 0, latency_p95_ms: null, input_tokens: 0, output_tokens: 0, open_reviews: 0, daily_requests: 0, broadcaster: "null", last_successful_broadcast_at: null, broadcast_failures_last_24h: 0, circuit_open: false, policy_version: "default-disabled", provider_cost: null, costed_requests: 0, connectivity: { reverb_live_probe: "not_measured" } } } });
    if (path === "/api/v1/ai/conversations") return route.fulfill({ json: { data: [] } });
    if (path === "/api/v1/ai/conversations/" + conversation) { state.detailReads++; return route.fulfill({ json: { data: { id: conversation, messages: [message()], replies: state.reply ? [{ id: "reply-1", sender: "human_support", body: "A human has reviewed your order.", created_at: "2026-10-31T09:00:00Z" }] : [] } } }); }
    if (path === "/api/v1/ai/messages/" + messageId) return route.fulfill({ json: { data: message() } });
    if (path === "/api/v1/ai/chat") return route.fulfill({ status: 202, json: { data: { id: messageId, conversation_id: conversation, status: state.status, display: { show_progress_updates: state.display, show_verified_badge: state.display } } } });
    return route.fulfill({ json: { data: [], meta: { unread_count: 0, total: 0 } } });
  });
  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill({ status: 204 }));
  return state;
}
const wallet = (page: Page) => page.locator("aside > div").first();
test("wallet loading never asserts zero", async ({ page }) => { const state = await setup(page); state.wallet = "loading"; await page.goto("/app/support"); await expect(wallet(page).getByText("Loading wallet…")).toBeVisible(); await expect(wallet(page).getByText(/€.*0[,.]00/)).toHaveCount(0); });
test("failed wallet is unavailable and retries", async ({ page }) => { const state = await setup(page); state.wallet = "error"; await page.goto("/app/support"); await expect(wallet(page).getByRole("alert")).toContainText("unavailable"); await expect(wallet(page).getByText(/€.*0[,.]00/)).toHaveCount(0); state.wallet = "ready"; await wallet(page).getByRole("button", { name: "Retry" }).click(); await expect(wallet(page).getByRole("alert")).toHaveCount(0); await expect(wallet(page).getByText(/10[,.]00/)).toBeVisible(); });
test("verified empty balance is explicit", async ({ page }) => { const s = await setup(page); s.available = 0; s.reserved = 0; await page.goto("/app/support"); await expect(wallet(page).getByText("No available or reserved balance.")).toBeVisible(); });
test("reserved balance has no reward or release promise", async ({ page }) => { await setup(page); await page.goto("/app/support"); await expect(wallet(page).getByText("This is the reserved portion of your wallet balance.")).toBeVisible(); await expect(wallet(page)).not.toContainText(/reward|once available|beloning/); });
test("refresh restores and recovers a pending answer", async ({ page }) => { const s = await setup(page); await page.goto("/app/support?conversation=" + conversation); await expect(page.getByLabel("Message", { exact: true })).toBeDisabled(); await page.reload(); await expect(page.getByLabel("Message", { exact: true })).toBeDisabled(); s.status = "VERIFIED"; await expect(page.getByRole("log")).toContainText("EUR 10.00", { timeout: 15000 }); await expect(page.getByLabel("Message", { exact: true })).toBeEnabled(); });
test("missed human reply recovers on focus", async ({ page }) => { const s = await setup(page); s.status = "VERIFIED"; await page.goto("/app/support?conversation=" + conversation); await expect(page.getByRole("log")).toContainText("EUR 10.00"); s.reply = true; await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await expect(page.getByRole("log")).toContainText("A human has reviewed your order."); await expect(page.getByText("A human has reviewed your order.")).toHaveCount(1); });
test("missed answer catches up on browser reconnect", async ({ page }) => { const s = await setup(page); await page.goto("/app/support?conversation=" + conversation); await expect(page.getByLabel("Message", { exact: true })).toBeDisabled(); s.status = "VERIFIED"; await page.evaluate(() => window.dispatchEvent(new Event("online"))); await expect(page.getByRole("log")).toContainText("EUR 10.00"); });
test("no optimistic online claim", async ({ page }) => { await setup(page); await page.goto("/app/support"); await expect(page.getByText("Periodic updates", { exact: true })).toBeVisible(); await expect(page.getByText("Online", { exact: true })).toHaveCount(0); });
test("English support labels and fallback stay English", async ({ page }) => { const s = await setup(page); s.status = "UNAVAILABLE"; await page.goto("/app/support?conversation=" + conversation); await expect(page.getByPlaceholder("Ask a question about ShopBonus...")).toBeVisible(); await expect(page.getByRole("log")).toContainText("We could not verify an answer"); await expect(page.locator("aside")).toContainText("Frequently asked questions"); await expect(page.locator("aside")).not.toContainText(/Veelgestelde|Gereserveerd|Mijn ShopBonus/); });
test("Dutch support labels remain Dutch", async ({ page }) => { await setup(page, "nl"); await page.goto("/app/support"); await expect(page.getByPlaceholder("Stel je vraag over ShopBonus...")).toBeVisible(); await expect(wallet(page).getByText("Gereserveerd", { exact: true })).toBeVisible(); });
test("published display controls suppress progress and badge", async ({ page }) => { const s = await setup(page); s.display = false; await page.goto("/app/support?conversation=" + conversation); await expect(page.getByLabel("Message", { exact: true })).toBeDisabled(); await expect(page.getByRole("log")).not.toContainText("Checking account"); s.status = "VERIFIED"; await expect(page.getByRole("log")).toContainText("EUR 10.00"); await expect(page.getByText("Checked against your account information")).toHaveCount(0); });
test("workspace action cannot open an unauthorized workspace", async ({ page }) => { const s = await setup(page); s.merchant = true; await page.goto("/dashboard/offers?workspace=01j00000000000000000000009"); await expect(page.getByRole("alert").filter({ hasText: "Workspace unavailable." })).toBeVisible(); });

test("settings tabs lock unsupported controls and monitoring exposes filters", async ({ page }) => {
  const s = await setup(page); s.admin = true;
  await page.goto("/app/platform/ai-support/settings");
  await page.getByRole("button", { name: "Behavior", exact: true }).click();
  await expect(page.getByLabel(/Tone/)).toBeDisabled();
  await expect(page.getByLabel("Show progress updates")).toBeEnabled();
  await page.getByRole("button", { name: "OpenAI", exact: true }).click();
  await expect(page.getByLabel(/Reasoning effort/)).toBeDisabled();
  await expect(page.getByLabel("max_output_tokens", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Monitoring", exact: true }).click();
  await expect(page.getByLabel("scope", { exact: true })).toBeVisible();
  await expect(page.getByText("Estimated provider cost (EUR)", { exact: true })).toBeVisible();
});
