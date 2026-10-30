/**
 * Webshop-owner landing smoke tests.
 * npx playwright test e2e/voor-webshops.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";

test.describe("voor-webshops landing", () => {
  test("desktop hero, shared site header, CTAs, platforms, timeline, FAQ", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/voor-webshops`);

    await expect(page.getByTestId("site-header")).toBeVisible();
    const headerNav = page.getByTestId("site-header").getByRole("navigation", { name: /Hoofdnavigatie|Main/i });
    await expect(headerNav.getByRole("link", { name: /Webshops/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /Kortingscodes|Discount codes/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /Hoe werkt het|How it works/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /Over ons|About us/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /^FAQ$/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /Contact/i })).toBeVisible();
    await expect(headerNav.getByRole("link", { name: /Voor webshops|For webshops/i })).toBeVisible();

    await expect(page.getByTestId("merchant-hero")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Meer klanten|More customers/i);
    await expect(page.getByTestId("cms-edit-voor-webshops")).toHaveCount(0);

    await expect(page.getByTestId("hero-primary-cta")).toHaveAttribute("href", /voor-webshops\/aanmelden/);
    await expect(page.getByTestId("bottom-cta-button")).toHaveAttribute("href", /voor-webshops\/aanmelden/);
    await expect(page.getByTestId("offer-preview-cta")).toHaveAttribute("href", /webshops/);

    await expect(page.getByTestId("merchant-platforms")).toBeVisible();
    await expect(page.getByTestId("merchant-benefits")).toBeVisible();
    await expect(page.getByTestId("merchant-offer-preview")).toContainText(/Illustratief|illustrative|voorbeeld/i);
    await expect(page.getByTestId("merchant-onboarding")).toContainText(/01/);
    await expect(page.getByTestId("merchant-faq")).toBeVisible();
  });

  test("mobile site header menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/voor-webshops`);

    await page.getByTestId("site-header").getByRole("button", { name: /Navigatiemenu|Menu/i }).click();
    const mobileNav = page.getByRole("navigation", { name: /Mobiele navigatie|Mobile/i });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Webshops/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Contact/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Voor webshops|For webshops/i })).toBeVisible();

    await expect(page.getByTestId("merchant-onboarding").locator("ol")).toBeVisible();
  });

  test("registration CTA opens aanmelden wizard", async ({ page }) => {
    await page.goto(`${base}/voor-webshops`);
    await page.getByTestId("hero-primary-cta").click();
    await expect(page).toHaveURL(/\/voor-webshops\/aanmelden/);
  });
});
