/**
 * About Us (/over-ons) smoke + acceptance checks.
 * npx playwright test e2e/over-ons.spec.ts
 */
import { expect, test } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";

test.describe("over-ons About Us", () => {
  test("desktop matches About Us sections and navbar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/over-ons`);

    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Hoofdnavigatie/i }).getByText("Over ons")).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Hoofdnavigatie/i }).getByText("Over ons")).toHaveAttribute(
      "aria-current",
      "page"
    );

    await expect(page.getByTestId("about-hero")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/voordeliger|more rewarding/i);
    await expect(page.getByTestId("about-hero-cta")).toHaveAttribute("href", /#verhaal/);

    await expect(page.getByTestId("about-story")).toBeVisible();
    await expect(page.getByTestId("about-revenue")).toBeVisible();
    await expect(page.getByTestId("about-split-consumer")).toContainText(/70%/);
    await expect(page.getByTestId("about-split-platform")).toContainText(/30%/);
    await expect(page.getByTestId("about-revenue")).not.toContainText(/%\s*(cashback\s+)?(op|van)\s+(de\s+)?aankoop/i);

    await expect(page.getByTestId("about-values")).toBeVisible();
    await expect(page.getByTestId("about-team")).toBeVisible();
    await expect(page.getByTestId("about-team-profiles")).toHaveCount(0);

    await expect(page.getByTestId("about-contact")).toBeVisible();
    await expect(page.getByTestId("about-bottom-cta")).toBeVisible();
    await expect(page.getByTestId("about-cta-consumer")).toHaveAttribute("href", /\/webshops/);
    await expect(page.getByTestId("about-cta-merchant")).toHaveAttribute("href", /\/voor-webshops/);

    await expect(page.getByTestId("cms-edit-over-ons")).toHaveCount(0);
  });

  test("mobile layout without sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/over-ons`);

    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.getByTestId("about-hero")).toBeVisible();
    await expect(page.getByTestId("about-revenue")).toBeVisible();
    await expect(page.getByTestId("about-bottom-cta")).toBeVisible();
  });

  test("story CTA scrolls to verhaal", async ({ page }) => {
    await page.goto(`${base}/over-ons`);
    await page.getByTestId("about-hero-cta").click();
    await expect(page.getByTestId("about-story")).toBeInViewport();
  });

  test("consumer and merchant CTAs navigate", async ({ page }) => {
    await page.goto(`${base}/over-ons`);
    await page.getByTestId("about-cta-consumer").click();
    await expect(page).toHaveURL(/\/webshops/);

    await page.goto(`${base}/over-ons`);
    await page.getByTestId("about-cta-merchant").click();
    await expect(page).toHaveURL(/\/voor-webshops/);
  });

  test("contact links are present", async ({ page }) => {
    await page.goto(`${base}/over-ons`);
    await expect(page.getByTestId("about-contact-link-0")).toBeVisible();
    await expect(page.getByTestId("about-contact-link-1")).toHaveAttribute("href", /privacy/i);
  });
});
