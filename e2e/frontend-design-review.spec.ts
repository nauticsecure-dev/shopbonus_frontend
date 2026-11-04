import { expect, test, type Page } from "@playwright/test";

async function guest(page: Page) {
  await page.context().addCookies([
    { name: "shopbonus-locale", value: "nl", url: test.info().project.use.baseURL! },
    { name: "XSRF-TOKEN", value: "design-review", url: test.info().project.use.baseURL! },
  ]);
  await page.route("**/api/v1/me", route => route.fulfill({ status: 401, json: { message: "Unauthenticated." } }));
}

test("homepage coupon actions stay within the card on small phones", async ({ page }) => {
  await guest(page);
  await page.route("**/api/v1/public/discount-codes*", route => route.fulfill({ json: { data: [{
    id: "design-coupon", slug: "design-coupon", title: "Design review coupon", summary: "10% korting", terms: null,
    code: "WELKOM10", ends_at: null, webshop: { slug: "review", name: "Review shop", cover_url: "/design-broken.png", logo_url: null }, href: "/webshops/review",
  }] } }));
  await page.route("**/design-broken.png", route => route.fulfill({ status: 404, body: "missing" }));
  await page.goto("/");
  const panel = page.getByTestId("discount-codes-panel");
  await expect(panel.getByText("Design review coupon")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const card = panel.getByText("Design review coupon").locator("xpath=ancestor::div[contains(@class,'border-slate-100')]");
    const bounds = await card.boundingBox();
    for (const action of await card.locator("button, a").all()) {
      const box = await action.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(panel.locator('img[src="/design-broken.png"]')).toHaveCount(0);
});

test("a stalled coupon request ends in a recoverable error instead of an endless skeleton", async ({ page }) => {
  await guest(page);
  await page.clock.install();
  await page.route("**/api/v1/public/discount-codes*", () => {});
  await page.goto("/");
  const panel = page.getByTestId("discount-codes-panel");
  await expect(panel).toBeVisible();
  await page.clock.fastForward(9000);
  await expect(panel).toContainText("Kortingscodes konden niet worden geladen");
  await expect(panel.locator(".animate-pulse")).toHaveCount(0);
});

test("popular shop cards replace failed images with shop initials", async ({ page }) => {
  await guest(page);
  await page.route("**/*", route => route.request().resourceType() === "image" ? route.abort() : route.fallback());
  await page.goto("/");
  const cards = page.getByTestId("popular-webshops").locator('a[href^="/webshops/"]');
  await expect(cards.first()).toBeVisible();
  await cards.first().scrollIntoViewIfNeeded();
  await expect(cards.first().locator("img")).toHaveCount(0);
  await expect(cards.first().locator("span, div").filter({ hasText: /^[A-Z&]{1,3}$/ }).first()).toBeVisible();
});
