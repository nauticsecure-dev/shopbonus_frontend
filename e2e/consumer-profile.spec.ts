import { expect, test, type Page, type Route } from "@playwright/test";

// Browser regression tests with controlled API responses. Real persistence,
// ownership, OTP, reminder dispatch and password sessions are backend tests;
// this suite does not claim the ten real-service acceptance journeys.
async function setup(page: Page) {
  const state = {
    profile: {
      id: "consumer-1", first_name: "Anna", email: "anna@example.nl",
      email_verification: "verified", pending_email: null, phone: "+31612345678",
      locale: "nl", avatar_url: null as string | null,
      security: { email_verified: true, two_factor: "disabled" },
      notifications: { vouchers_discounts: true, reminders: true, offers_inspiration: true },
    },
    prefs: {
      locale: "nl", email_enabled: true, email_delivery_available: true,
      preferences: Object.fromEntries(["cashback_credited", "voucher_expiring", "favorite_merchant_offer", "support_reply"].map((event) => [event, { email: true, in_app: true }])),
    },
    failProfile: false, failWallet: false, wallet: 1220,
  };
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "nl"));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/api/v1/me") return route.fulfill({ json: { data: {
      ...state.profile, email_verified: true, status: "active", role: "consumer",
      onboarding_intent: "consumer", roles: [], workspaces: [], destination: "consumer_dashboard",
      two_factor_enabled: state.profile.security.two_factor === "enabled", support_session: null,
    } } });
    if (path === "/api/v1/consumer/profile") {
      if (state.failProfile) return route.fulfill({ status: 503, json: { message: "Tijdelijk niet beschikbaar" } });
      if (method === "PATCH") Object.assign(state.profile, route.request().postDataJSON());
      return route.fulfill({ json: { data: state.profile } });
    }
    if (path === "/api/v1/consumer/profile/avatar") {
      state.profile.avatar_url = method === "DELETE" ? null : "/favicon-32.png";
      return route.fulfill({ json: { data: state.profile } });
    }
    if (path === "/api/v1/consumer/preferences") {
      Object.assign(state.profile.notifications, route.request().postDataJSON()?.notifications);
      return route.fulfill({ json: { data: { notifications: state.profile.notifications, categories: ["fashion"] } } });
    }
    if (path === "/api/v1/notification-preferences") {
      if (method === "PUT") {
        const body = route.request().postDataJSON();
        if (body.email_enabled !== undefined) state.prefs.email_enabled = body.email_enabled;
        for (const [key, channels] of Object.entries(body.preferences ?? {})) Object.assign(state.prefs.preferences[key], channels);
      }
      return route.fulfill({ json: { data: state.prefs } });
    }
    if (path === "/api/v1/me/wallet") return route.fulfill({
      status: state.failWallet ? 503 : 200,
      json: state.failWallet ? { message: "Wallet offline" } : { data: {
        available_minor: state.wallet, reserved_minor: 0, total_earned_minor: state.wallet,
        total_spent_minor: 0, currency: "EUR", unit: "eur_credit", updated_at: "2026-10-31T00:00:00Z",
      } },
    });
    if (path.includes("cookie")) return route.fulfill({ status: 503, json: {} });
    return route.fulfill({ json: { data: [], meta: { unread_count: 0, total: 0, current_page: 1, per_page: 20 } } });
  });
  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill({ status: 204 }));
  return state;
}

async function open(page: Page) {
  await page.goto("/profiel");
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("Anna");
}
const photo = { name: "avatar.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4ioAAAAASUVORK5CYII=", "base64") };
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
async function failed(route: Route) { await route.fulfill({ status: 503, json: { message: "Probeer opnieuw" } }); }

test("loads server profile and authoritative wallet, with desktop screenshot", async ({ page }, testInfo) => {
  await setup(page);
  await open(page);
  await expect(page.getByLabel("E-mailadres", { exact: true })).toHaveValue("anna@example.nl");
  await expect(page.getByLabel(/Telefoonnummer/)).toHaveValue("+31612345678");
  await expect(page.getByRole("switch", { name: /^Herinneringen/ })).toBeChecked();
  await expect(page.locator("header")).toContainText("12,20");
  await page.screenshot({ path: testInfo.outputPath("profile-desktop.png"), fullPage: true });
});

test("failed initial load has persistent retry and recovers", async ({ page }) => {
  const state = await setup(page);
  state.failProfile = true;
  await page.goto("/profiel");
  await expect(page.getByRole("heading", { name: "Profiel tijdelijk niet beschikbaar" })).toBeVisible();
  state.failProfile = false;
  await page.getByRole("button", { name: "Opnieuw proberen", exact: true }).click();
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("Anna");
});

test("details persist on reload and invalid names leave saved data intact", async ({ page }) => {
  const state = await setup(page);
  await open(page);
  await page.getByLabel("Voornaam", { exact: true }).fill("Anne");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Je profiel is bijgewerkt.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("Anne");
  await page.getByLabel("Voornaam", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Gebruik alleen letters, spaties, apostroffen of koppeltekens.").first()).toBeVisible();
  expect(state.profile.first_name).toBe("Anne");
});

test("photo upload and removal preserve drafts and update the header avatar", async ({ page }) => {
  await setup(page);
  await open(page);
  await page.getByLabel("Voornaam", { exact: true }).fill("Unsaved");
  await page.getByLabel(/Telefoonnummer/).fill("0611111111");
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.getByTestId("header-profile").locator("img")).toHaveAttribute("src", "/favicon-32.png");
  await page.getByRole("button", { name: /Verwijder/ }).first().click();
  await expect(page.getByTestId("header-profile").locator("img")).toHaveCount(0);
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("Unsaved");
  await expect(page.getByLabel(/Telefoonnummer/)).toHaveValue("0611111111");
  await page.route("**/api/v1/consumer/profile/avatar", failed);
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.getByText("Upload geweigerd", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("Unsaved");
});

test("typing while details save is in flight keeps the newer draft", async ({ page }) => {
  const state = await setup(page);
  const wait = gate();
  await page.route("**/api/v1/consumer/profile", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    const body = route.request().postDataJSON();
    await wait.promise;
    Object.assign(state.profile, body);
    await route.fulfill({ json: { data: state.profile } });
  });
  await open(page);
  await page.getByLabel("Voornaam", { exact: true }).fill("Saved");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await page.getByLabel("Voornaam", { exact: true }).fill("New draft");
  wait.release();
  await expect(page.getByText("Je profiel is bijgewerkt.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("New draft");
});

test("late avatar snapshot cannot revert a completed details save", async ({ page }) => {
  const state = await setup(page);
  const wait = gate();
  await page.route("**/api/v1/consumer/profile/avatar", async (route) => {
    const snapshot = { ...state.profile, avatar_url: "/favicon-32.png" };
    await wait.promise;
    await route.fulfill({ json: { data: snapshot } });
  });
  await open(page);
  await page.locator('input[type="file"]').setInputFiles(photo);
  await page.getByLabel("Voornaam", { exact: true }).fill("New name");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Je profiel is bijgewerkt.", { exact: true })).toBeVisible();
  wait.release();
  await expect(page.getByTestId("header-profile").locator("img")).toBeVisible();
  await expect(page.getByLabel("Voornaam", { exact: true })).toHaveValue("New name");
});

test("failed consent save cannot revert concurrent avatar changes", async ({ page }) => {
  await setup(page);
  const wait = gate();
  await page.route("**/api/v1/consumer/preferences", async (route) => { await wait.promise; await failed(route); });
  await open(page);
  await page.getByRole("switch", { name: /^Herinneringen/ }).click();
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.getByTestId("header-profile").locator("img")).toBeVisible();
  wait.release();
  await expect(page.getByText("Voorkeur niet opgeslagen", { exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: /^Herinneringen/ })).toBeChecked();
  await expect(page.locator('main img[src="/favicon-32.png"]')).toBeVisible();
});

test("event email shows consent and master-switch dependencies and serializes changes", async ({ page }) => {
  await setup(page);
  await open(page);
  const row = page.locator("#notification-channels .space-y-1\\.5").filter({ has: page.getByRole("switch", { name: /^Voucher verloopt/ }) });
  await expect(row).toContainText("Effectief:");
  await page.getByRole("switch", { name: /^Herinneringen/ }).click();
  await expect(row).toContainText("Geblokkeerd door toestemming");
  await page.getByRole("switch", { name: /^Herinneringen/ }).click();
  await expect(row).toContainText("Effectief:");
  const wait = gate();
  await page.route("**/api/v1/notification-preferences", async (route) => {
    if (route.request().method() === "PUT") await wait.promise;
    await route.fallback();
  });
  await page.getByRole("switch", { name: /^Optionele e-mailbezorging/ }).click();
  await expect(page.getByRole("switch", { name: /^Voucher verloopt/ })).toBeDisabled();
  wait.release();
  await expect(row).toContainText("Geblokkeerd omdat optionele");
  await page.getByRole("switch", { name: /^Voucher verloopt/ }).click();
  await expect(row).toContainText("E-mail uit voor deze gebeurtenis.");
});

test("password confirmation UI and existing Fortify 2FA interface", async ({ page }) => {
  await setup(page);
  await open(page);
  await page.getByRole("button", { name: /^Wachtwoord wijzigen/ }).click();
  const inputs = page.locator('input[type="password"]');
  await inputs.nth(0).fill("Current-password1");
  await inputs.nth(1).fill("New-password2");
  await inputs.nth(2).fill("Different-password3");
  await page.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(page.getByText("Wachtwoord niet gewijzigd", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Annuleren", exact: true }).click();
  await page.getByRole("button", { name: /Tweestapsverificatie/ }).click();
  await expect(page.getByRole("heading", { name: "Tweestapsverificatie" })).toBeVisible();
  let confirmed = false;
  await page.route("**/user/confirm-password", async (route) => { confirmed = true; await route.fulfill({ status: 201, json: {} }); });
  await page.route("**/user/two-factor-authentication", (route) => route.fulfill({ json: {} }));
  await page.route("**/user/two-factor-qr-code", (route) => route.fulfill({ json: { svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' } }));
  await page.locator('input[type="password"]').fill("Current-password1");
  await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
  await expect(page.getByText("Authenticatorcode", { exact: true })).toBeVisible();
  expect(confirmed).toBe(true);
});

test("failed wallet refresh marks a previous balance stale on desktop and mobile", async ({ page }, testInfo) => {
  const state = await setup(page);
  await open(page);
  await expect(page.locator("header")).toContainText("12,20");
  state.failWallet = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("header")).toContainText("Verouderd");
  await expect(page.locator("header")).toContainText("12,20");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Navigatiemenu", exact: true }).click();
  await expect(page.getByText("Mijn ShopBonus-tegoed (verouderd)", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("profile-mobile-wallet-error.png"), fullPage: true });
});
