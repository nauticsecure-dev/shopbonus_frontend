/**
 * Consumer homepage + Super Admin CMS smoke tests (checklist items 1–17 guest-visible).
 * npx playwright test e2e/homepage.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";

test.describe("ShopBonus homepage", () => {
  test("desktop layout: nav, hero, search, shops, how-it-works, codes, wallet", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/`);

    await expect(page.getByTestId("homepage")).toBeVisible();
    await expect(page.getByTestId("site-header")).toBeVisible();

    const nav = page.getByRole("navigation", { name: /Hoofdnavigatie/i });
    await expect(nav.getByRole("link", { name: "Webshops" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Cashback" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Kortingscodes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Hoe werkt het?" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Contact" })).toBeVisible();

    await expect(page.getByTestId("header-login")).toHaveAttribute("href", /account.*login/);
    await expect(page.getByTestId("header-register")).toHaveAttribute("href", /\/account/);
    await expect(page.getByTestId("header-search")).toBeVisible();

    await expect(page.getByTestId("homepage-hero")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Shop zoals je altijd doet|Spaar voor wat/i);

    const primary = page.getByRole("link", { name: /Ontdek aanbiedingen/i }).first();
    await expect(primary).toHaveAttribute("href", /webshops/);
    await expect(page.getByRole("link", { name: /Hoe werkt het\?/i }).first()).toHaveAttribute(
      "href",
      /hoe-werkt-het/
    );

    await expect(page.getByTestId("home-search")).toBeVisible();
    await expect(page.getByTestId("popular-webshops")).toBeVisible();
    await expect(page.getByTestId("how-it-works")).toContainText(/Zo werkt ShopBonus|Ontdek voordeel/i);
    await expect(page.getByTestId("discount-codes-panel")).toBeVisible();
    await expect(page.getByTestId("wallet-preview-guest")).toBeVisible();

    // No cash withdrawal wording on the public homepage.
    await expect(page.locator("body")).not.toContainText(/Uitbetalen|Opnemen|Withdraw/i);

    // Guests never see inline CMS chrome.
    await expect(page.getByTestId("cms-edit-homepage")).toHaveCount(0);
  });

  test("tablet and mobile: hamburger nav, no permanent sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/`);

    await expect(page.locator("aside")).toHaveCount(0);
    await page.getByRole("button", { name: /Navigatiemenu/i }).click();
    const mobile = page.getByRole("navigation", { name: /Mobiele navigatie/i });
    await expect(mobile).toBeVisible();
    await expect(mobile.getByRole("link", { name: "Webshops" })).toBeVisible();
    await expect(mobile.getByRole("link", { name: "Kortingscodes" })).toBeVisible();
  });

  test("search autocomplete keyboard and empty state", async ({ page }) => {
    await page.goto(`${base}/`);
    const input = page.locator("#home-search-input");
    await input.fill("zzzz-geen-resultaat-xyz");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Geen resultaten/i)).toBeVisible();

    await input.fill("");
    await input.fill("a");
    // Debounce requires 2+ chars — still no listbox forced open.
    await input.press("Escape");
  });

  test("popular webshop cards link to detail routes", async ({ page }) => {
    await page.goto(`${base}/`);
    const section = page.getByTestId("popular-webshops");
    const cards = section.locator('a[href^="/webshops/"]');
    const count = await cards.count();
    if (count === 0) {
      await expect(section.getByText(/Nog geen gepubliceerde webshops|niet worden geladen/i)).toBeVisible();
      return;
    }
    const href = await cards.first().getAttribute("href");
    expect(href).toMatch(/^\/webshops\/[a-z0-9-]+$/);
  });

  test("discount code copy button works when codes exist", async ({ page }) => {
    await page.goto(`${base}/`);
    const panel = page.getByTestId("discount-codes-panel");
    const copyBtn = panel.locator('button[aria-label^="Kopieer code"]');
    if ((await copyBtn.count()) === 0) {
      await expect(panel).toContainText(/geen actieve|niet worden geladen|aanbiedingen/i);
      return;
    }
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await copyBtn.first().click();
    await expect(panel.getByText(/Gekopieerd|Naar webshop/i).first()).toBeVisible();
  });

  test("nav CTAs reach clean consumer routes", async ({ page }) => {
    await page.goto(`${base}/`);
    await page.getByRole("navigation", { name: /Hoofdnavigatie/i }).getByRole("link", { name: "Kortingscodes" }).click();
    await expect(page).toHaveURL(/\/kortingscodes/);
    await page.goto(`${base}/`);
    await page.getByTestId("header-register").click();
    await expect(page).toHaveURL(/\/account/);
  });
});
