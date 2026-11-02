import { expect, test } from "@playwright/test";

// Opt-in smoke against an existing seeded local/staging API. No fixture data or
// customer mutations. The proxy allows using the running frontend's API origin.
test("live directory filters and clean slug details", async ({ page }) => {
  const api = process.env.DISCOVERY_LIVE_API_BASE_URL;
  test.skip(!api, "Set DISCOVERY_LIVE_API_BASE_URL to a running API with published shops.");
  await page.route("**/api/v1/**", async route => {
    const original = new URL(route.request().url());
    const response = await fetch(`${api}${original.pathname}${original.search}`, {
      headers: { Accept: "application/json", "Accept-Language": "nl" },
    });
    await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/webshops");
  const cards = page.locator('main a[href^="/webshops/"]');
  await expect(cards.first()).toBeVisible();
  await page.getByRole("button", { name: "Met actieve aanbieding", exact: true }).click();
  await page.getByRole("button", { name: "Wonen", exact: true }).click();
  await page.getByRole("combobox").selectOption("name");
  const loaded = page.waitForResponse(r => r.url().includes("/public/webshops?") && r.url().includes("search=woon") && r.status() === 200);
  await page.getByRole("textbox", { name: "Zoek een webshop" }).fill("woon");
  await loaded;
  await expect(cards.first()).toBeVisible();
  await page.screenshot({ path: "test-results/discovery-live-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/discovery-live-mobile.png", fullPage: true });
  const name = await cards.first().getByRole("heading").innerText();
  const href = await cards.first().getAttribute("href");
  await cards.first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});
