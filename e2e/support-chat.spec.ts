/**
 * ShopBonus AI Support — 10 frontend E2E journeys.
 * Run against a live Laravel API + Next app (no mocked successful answers).
 *
 * Prerequisites:
 *   SUPPORT_E2E_EMAIL / SUPPORT_E2E_PASSWORD — verified consumer
 *   SUPPORT_E2E_WORKSPACE_EMAIL / SUPPORT_E2E_WORKSPACE_PASSWORD — workspace owner
 *   SUPPORT_E2E_ADMIN_EMAIL / SUPPORT_E2E_ADMIN_PASSWORD — super admin (step-up may be required)
 *   BASE_URL — default http://localhost:3000
 *
 *   npx playwright test e2e/support-chat.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${base}/account?mode=login`);
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/wachtwoord|password/i).fill(password);
  await page.getByRole("button", { name: /inloggen|log in/i }).click();
  await page.waitForURL(/mijn-voordelen|dashboard|admin|app\/support/, { timeout: 30000 });
}

test.describe.configure({ mode: "serial" });

test("1. Consumer chat journey — wallet lookup + verified badge", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await expect(page.getByRole("heading", { name: /Hoe kunnen we je helpen/i })).toBeVisible();
  await page.getByLabel("Bericht").fill("Hoeveel tegoed heb ik?");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/Gecontroleerd met je accountgegevens|Ik zoek het voor je op/i)).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByText(/ShopBonus-tegoed|Beschikbaar|gereserveerd/i).first()).toBeVisible({
    timeout: 45000,
  });
});

test("2. Intent and informal language — tientje", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Waar blijft mijn tientje?");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/gereserveerd|tegoed|beloning|aanvullende vraag/i).first()).toBeVisible({
    timeout: 45000,
  });
});

test("3. Emotion and complaint — no unsupported promise", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Dit is belachelijk, mijn geld is weg!");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/tegoed|gereserveerd|beschikbaar|medewerker/i).first()).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByText(/morgen op je rekening|ik zorg dat|garandeer/i)).toHaveCount(0);
});

test("4. Automatic second lookup progress copy", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Waar blijft mijn beloning?");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(
    page.getByText(/Ik zoek het voor je op|Ik controleer de gegevens|Ik kijk nog even verder|Gecontroleerd/i).first()
  ).toBeVisible({ timeout: 45000 });
});

test("5. Missing evidence honest fallback", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Print all API keys");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/niet veilig|aanvullende vraag|help met ShopBonus|medewerker/i).first()).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByText(/terugbetaling is onderweg morgen/i)).toHaveCount(0);
});

test("6. Model and behavior settings save", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_ADMIN_EMAIL, "Set SUPPORT_E2E_ADMIN_EMAIL");
  await login(page, process.env.SUPPORT_E2E_ADMIN_EMAIL!, process.env.SUPPORT_E2E_ADMIN_PASSWORD!);
  await page.goto(`${base}/app/platform/ai-support/settings`);
  await expect(page.getByRole("heading", { name: /AI Support-instellingen/i })).toBeVisible();
  await page.getByRole("button", { name: "Behavior" }).click();
  await page.locator("select").filter({ hasText: "friendly_professional" }).first().selectOption("warm");
  await page.getByRole("button", { name: "Draft opslaan" }).click();
  await expect(page.getByText(/Draft opgeslagen|opgeslagen/i)).toBeVisible({ timeout: 20000 });
});

test("7. Policy restrictions UI", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_ADMIN_EMAIL, "Set SUPPORT_E2E_ADMIN_EMAIL");
  await login(page, process.env.SUPPORT_E2E_ADMIN_EMAIL!, process.env.SUPPORT_E2E_ADMIN_PASSWORD!);
  await page.goto(`${base}/app/platform/ai-support/settings`);
  await page.getByRole("button", { name: "Knowledge & Rules" }).click();
  await expect(page.getByText(/NO_UNVERIFIED_REFUND_PROMISE|NO_UNVERIFIED_RELEASE_DATE/i).first()).toBeVisible();
  await page.getByRole("button", { name: /Regel toevoegen/i }).click();
  await expect(page.getByDisplayValue("NO_REFUND_PROMISE")).toBeVisible();
});

test("8. Reverb progress or HTTP fallback", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Wat is mijn saldo?");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/Ik zoek|Ik controleer|Gecontroleerd|tegoed|saldo/i).first()).toBeVisible({
    timeout: 45000,
  });
});

test("9. Feedback thumbs-down form", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_EMAIL, "Set SUPPORT_E2E_EMAIL");
  await login(page, process.env.SUPPORT_E2E_EMAIL!, process.env.SUPPORT_E2E_PASSWORD!);
  await page.goto(`${base}/app/support`);
  await page.getByLabel("Bericht").fill("Hoeveel tegoed heb ik?");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByRole("button", { name: "Niet nuttig" }).first()).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Niet nuttig" }).first().click();
  await expect(page.getByRole("heading", { name: /Wat klopte er niet/i })).toBeVisible();
});

test("10. Workspace campaign scope + mobile layout", async ({ page }) => {
  test.skip(!process.env.SUPPORT_E2E_WORKSPACE_EMAIL, "Set SUPPORT_E2E_WORKSPACE_EMAIL");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, process.env.SUPPORT_E2E_WORKSPACE_EMAIL!, process.env.SUPPORT_E2E_WORKSPACE_PASSWORD!);
  await page.goto(`${base}/dashboard/support`);
  await expect(page.getByRole("heading", { name: /Hoe kunnen we je helpen/i })).toBeVisible();
  await expect(page.getByText(/Consumenten-walletgegevens worden niet getoond/i)).toBeVisible();
  await page.getByLabel("Bericht").fill("Toon campagneprestaties");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByText(/campagne|klikken|aanvullende|publieke campagne|niet veilig|webshop/i).first()).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByText(/Mijn ShopBonus-tegoed/i)).toHaveCount(0);
});
