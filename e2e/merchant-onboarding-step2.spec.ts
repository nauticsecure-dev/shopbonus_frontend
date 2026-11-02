import { test, expect, type Page } from "@playwright/test";

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

// Browser acceptance with controlled API latency/errors; backend gates are tested separately.
async function setup(page: Page, options: { fresh?: boolean; approved?: boolean } = {}) {
  const state = { writes: [] as Record<string, unknown>[], creates: 0, active: 0, inFlight: 0, maxFlight: 0, delay: 0, fail: false, batchStatus: "committing", pollFail: false, inventory: 0, blockers: options.approved ? [] : [{ code: "merchant_not_approved", message: "Approval required" }] };
  let offer = options.fresh ? null : makeOffer({});
  await page.route("**/test-shop-logo.svg", r => r.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#0874ff"/><text x="32" y="44" text-anchor="middle" font-size="40" fill="white">S</text></svg>' }));
  await page.route("**/sanctum/csrf-cookie", r => r.fulfill({ status: 204 }));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: { data }, headers: { "Access-Control-Allow-Origin": new URL(process.env.BASE_URL || "http://localhost:3000").origin, "Access-Control-Allow-Credentials": "true" } });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(process.env.BASE_URL || "http://localhost:3000").origin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,OPTIONS", "Access-Control-Allow-Headers": "content-type,accept-language,x-xsrf-token" } });
    if (path.endsWith("/me")) return json({ id: "user1", first_name: "Merchant", email: "test@example.com", email_verified: true, role: "merchant", roles: [], locale: "nl", onboarding_intent: "merchant", destination: "workspace", workspaces: [{ id: "ws1", name: "Real Shop", status: options.approved ? "approved" : "draft", role: "owner", is_current: true }] });
    if (path.endsWith("/onboarding")) return json({ next_step: "ownership", webshop_status: options.approved ? "approved" : "draft", steps: [], registration: { current_step: "voucher_setup", steps: [], first_offer_id: offer?.id ?? null, available_codes: state.inventory, activation_blockers: state.blockers, branch_defaults: { rationale: "", suggestion: null } } });
    if (path.endsWith("/business-profile")) return json({ domain_locked: true });
    if (path.endsWith("/public-profile")) return json({ display_name: "Real Shop", website_url: null, description: null, short_description: null, categories: [], logo_url: "/test-shop-logo.svg" });
    if (path.endsWith("/offers") && method === "GET") return json(offer ? [offer] : []);
    if (/\/offers\/offer1$/.test(path) && method === "GET") return json(offer);
    if ((path.endsWith("/offers") && method === "POST") || (/\/offers\/offer1$/.test(path) && method === "PATCH")) {
      const body = route.request().postDataJSON(); state.writes.push(body); if (method === "POST") state.creates++;
      state.inFlight++; state.maxFlight = Math.max(state.maxFlight, state.inFlight);
      if (state.delay) await new Promise(r => setTimeout(r, state.delay));
      state.inFlight--;
      if (state.fail) return route.fulfill({ status: 422, json: { message: "Invalid offer" } });
      offer = makeOffer(body); return json(offer);
    }
    if (path.endsWith("/activate")) { state.active++; return json({ ...offer, status: "active" }); }
    if (path.endsWith("/code-imports") || path.includes("/code-imports/batch1")) {
      if (method === "GET" && state.pollFail) return route.fulfill({ status: 503, json: { message: "Unavailable" } });
      const status = path.endsWith("/code-imports") ? "preview" : state.batchStatus;
      if (status === "committed") state.inventory = 2;
      return json({ id: "batch1", status, source: "paste", totals: { submitted: 3, valid: 3, invalid: 0, duplicate_in_upload: 0, duplicate_existing: 0, ...(status === "committed" ? { imported: 2 } : {}) }, rejections: [] });
    }
    return json([]);
  });
  await page.goto("/voor-webshops/aanmelden");
  await expect(page.getByRole("heading", { name: "Live preview van je voucher" })).toBeVisible();
  return state;
}
function makeOffer(body: Record<string, unknown>) {
  return { id: "offer1", status: "draft", acquisition: "merchant_reward", missing_for_activation: [], terms: { discount_type: "percentage", discount_value: 1000, min_order_minor: 10000, max_discount_minor: 1000, claim_validity_days: 90, redemption_validity_days: 90, public_description: "Saved conditions", ...body }, cost_preview: { applies: true, fee_rate_bps: 3000, per_voucher: { reward_minor: 1000, fee_minor: 300, merchant_commitment_minor: 1300 } }, preview: null };
}

test("serializes initial creation, preserves newer typing and updates preview immediately", async ({ page }) => {
  const s = await setup(page, { fresh: true }); s.delay = 1800;
  await expect.poll(() => s.creates).toBe(1);
  await page.getByRole("spinbutton", { name: "Korting", exact: true }).fill("25");
  await expect(page.getByText("25% korting", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Definitieve merchant-kosten", { exact: false })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Korting", exact: true })).toHaveValue("25");
  await expect.poll(() => s.writes.at(-1)?.discount_value).toBe(2500);
  await expect(page.getByRole("status").filter({ hasText: "Concept opgeslagen" })).toBeVisible();
  expect(s.creates).toBe(1); expect(s.maxFlight).toBe(1);
});

test("failed saves persist, retry succeeds, and navigation warns before losing input", async ({ page }) => {
  const s = await setup(page);
  await expect(page.getByRole("status").filter({ hasText: "Concept opgeslagen" })).toBeVisible();
  s.fail = true;
  await page.getByRole("spinbutton", { name: "Korting", exact: true }).fill("30");
  await expect(page.getByText("Niet opgeslagen: Invalid offer")).toBeVisible();
  page.once("dialog", d => d.dismiss());
  await page.getByRole("link", { name: /Contact/ }).first().click();
  await expect(page).toHaveURL(/aanmelden/);
  s.fail = false; await page.getByRole("button", { name: "Opnieuw opslaan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Concept opgeslagen" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Korting", exact: true })).toHaveValue("30");
});

test("queued imports recover after reload and count only confirmed inventory", async ({ page }) => {
  const s = await setup(page);
  await page.getByRole("textbox", { name: "Kortingscodes", exact: true }).fill("CODE1\nCODE2\nCODE3");
  await page.getByRole("button", { name: "Volgende: Activeren" }).click();
  await expect(page.getByText("Import wordt verwerkt.", { exact: false })).toBeVisible();
  await expect(page.getByText("0 codes beschikbaar", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Import wordt verwerkt.", { exact: false })).toBeVisible();
  s.pollFail = true;
  await expect(page.getByRole("button", { name: "Importstatus ophalen mislukt" })).toBeVisible();
  s.pollFail = false; s.batchStatus = "committed";
  await page.getByRole("button", { name: "Importstatus ophalen mislukt" }).click();
  await expect(page.getByText("2 codes beschikbaar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Volgende: Activeren" }).click();
  await expect(page.getByRole("button", { name: "Aanbieding activeren en naar dashboard" })).toBeDisabled();
  expect(s.active).toBe(0);
});

test("uses real branding and missing-data states; draft setup is allowed before approval", async ({ page }) => {
  await setup(page);
  await expect(page).toHaveURL(/aanmelden/);
  await expect(page.getByRole("img", { name: "Logo Real Shop" })).toBeVisible();
  await expect(page.getByText("Website ontbreekt", { exact: true })).toBeVisible();
  await expect(page.getByText("Beschrijving ontbreekt", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Klaar om te activeren", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Bewerken", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Website", exact: true })).toBeDisabled();
});

test("ready completion invokes the existing activation endpoint", async ({ page }) => {
  const s = await setup(page, { approved: true }); s.inventory = 2;
  await expect(page.getByText("Klaar om te activeren", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Volgende: Activeren" }).click();
  await page.getByRole("button", { name: "Aanbieding activeren en naar dashboard" }).click();
  await expect.poll(() => s.active).toBe(1);
});


test("fixed offer preview, conditions and validity update before saving on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = await setup(page); s.delay = 1500;
  await page.getByRole("combobox", { name: "Kortingssoort" }).selectOption("fixed");
  await page.getByRole("spinbutton", { name: "Korting", exact: true }).fill("15");
  await page.getByRole("combobox", { name: "Claimtermijn", exact: true }).selectOption("30");
  await page.getByRole("textbox", { name: "Aanvullende voorwaarden" }).fill("Alleen online");
  await expect(page.getByText("€15 voucher", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Claim: 30 dagen", { exact: false })).toContainText("Alleen online");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ animations: "disabled", path: "../docs/screenshots/onboarding-step2-revised-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "../docs/screenshots/onboarding-step2-revised-desktop.png", fullPage: true });
});

test("unsaved failed edits recover after leaving the page", async ({ page }) => {
  const s = await setup(page);
  await expect(page.getByRole("status").filter({ hasText: "Concept opgeslagen" })).toBeVisible();
  s.fail = true;
  await page.getByRole("spinbutton", { name: "Korting", exact: true }).fill("12.5");
  await expect(page.getByText("Niet opgeslagen: Invalid offer")).toBeVisible();
  page.once("dialog", d => d.accept());
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Korting", exact: true })).toHaveValue("12.5");
  await expect(page.getByText("Niet opgeslagen: Invalid offer")).toBeVisible();
  s.fail = false;
  await page.getByRole("button", { name: "Opnieuw opslaan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Concept opgeslagen" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Korting", exact: true })).toHaveValue("12.5");
});
