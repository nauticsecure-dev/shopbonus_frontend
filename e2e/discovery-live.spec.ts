import { expect as baseExpect, test } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 60_000 });

// Opt-in smoke against an existing seeded local/staging API. No fixture data or
// customer mutations. The proxy allows using the running frontend's API origin.
test("live directory filters and clean slug details", async ({ page }) => {
  test.setTimeout(180_000);
  // The local artisan server handles startup requests sequentially.
  const api = process.env.DISCOVERY_LIVE_API_BASE_URL;
  test.skip(!api, "Set DISCOVERY_LIVE_API_BASE_URL to a running API with published shops.");
  await page.context().addCookies([{ name: "shopbonus-locale", value: "nl", url: test.info().project.use.baseURL! }]);
  // Initialize CSRF from the real server before reads. Map its cookie to the
  // frontend origin used by this local proxy; this is not an authenticated login.
  const bootstrap = await page.request.get(`${api}/sanctum/csrf-cookie`);
  expect(bootstrap.ok()).toBeTruthy();
  const xsrf = bootstrap.headersArray().find(header =>
    header.name.toLowerCase() === "set-cookie" && header.value.startsWith("XSRF-TOKEN="));
  expect(xsrf, "Real Sanctum response must issue the CSRF cookie").toBeTruthy();
  await page.context().addCookies([{
    name: "XSRF-TOKEN", value: xsrf!.value.split(";")[0].slice("XSRF-TOKEN=".length),
    url: test.info().project.use.baseURL!,
  }]);
  let interruptDirectory = false;
  await page.route("**/api/v1/**", async route => {
    const original = new URL(route.request().url());
    // Fail transport once, then recover using real API responses on retry.
    if (interruptDirectory && original.pathname.endsWith("/public/webshops")) {
      interruptDirectory = false;
      return route.abort("failed");
    }
    const response = await fetch(`${api}${original.pathname}${original.search}`, {
      headers: { Accept: "application/json", "Accept-Language": "nl" },
    });
    await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/webshops");
  const cards = page.locator('main a[href^="/webshops/"]');
  await expect(cards.first()).toBeVisible();
  interruptDirectory = true;
  await page.getByRole("combobox").selectOption("newest");
  await expect(page.getByRole("heading", { name: "Kon webshops niet laden" })).toBeVisible();
  await page.getByRole("button", { name: "Opnieuw proberen", exact: true }).click();
  await expect(cards.first()).toBeVisible();
  await page.getByRole("textbox", { name: "Zoek een webshop" }).fill("discovery-no-match-20261103");
  await expect(page.getByRole("heading", { name: "Geen webshops gevonden" })).toBeVisible();
  await page.getByRole("button", { name: "Wis filters", exact: true }).click();
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
