import { expect, test, type Page } from "@playwright/test";

// Browser component acceptance with explicit API fixtures. Real API semantics are
// covered by backend Discovery tests; this suite is not full platform acceptance.
const shops = Array.from({ length: 49 }, (_, i) => ({
  slug: `shop-${i}`, name: `Shop ${String(i).padStart(2, "0")}`,
  short_description: "Een fijne webshop voor elke dag.",
  logo_url: i === 0 ? "http://localhost:3011/broken-logo.png" : null,
  cover_url: "http://localhost:3011/broken-cover.png",
  categories: [{ key: i % 2 ? "fashion" : "home_living", label: { nl: i % 2 ? "Mode" : "Wonen", en: "Category" } }],
  offer_count: i % 3, active_offer_count: i % 3,
}));

async function fixtures(page: Page, options: { loggedIn?: boolean; voucherError?: boolean; voucherDelay?: number } = {}) {
  const state = { requests: [] as URL[], voucherRequests: 0, voucherCount: 2, failDirectory: false };
  await page.route("**/broken-*.png", route => route.fulfill({ status: 404, body: "missing" }));
  await page.route("**/api/v1/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: unknown = [];
    let status = 200;
    if (path.endsWith("/me")) {
      status = options.loggedIn ? 200 : 401;
      data = options.loggedIn ? { id: "discovery-consumer", first_name: "Anna", email: "anna@example.test", email_verified: true, status: "active", role: "consumer", onboarding_intent: "consumer", locale: "nl", roles: [], workspaces: [], two_factor_enabled: false, support_session: null } : null;
    } else if (path.endsWith("/me/wallet")) {
      data = { available_minor: 1220, reserved_minor: 0, total_earned_minor: 1220, total_spent_minor: 0, currency: "EUR" };
    } else if (path.endsWith("/consumer/vouchers")) {
      state.voucherRequests++;
      if (options.voucherDelay) await new Promise(resolve => setTimeout(resolve, options.voucherDelay));
      status = options.voucherError ? 503 : 200;
      data = Array.from({ length: state.voucherCount }, (_, i) => ({ id: `voucher-${i}`, status: "ACTIVE" }));
    } else if (path.endsWith("/public/categories")) {
      data = shops.slice(0, 2).map(s => s.categories[0]);
    } else if (path.endsWith("/public/webshops")) {
      state.requests.push(url);
      if (state.failDirectory) return route.fulfill({ status: 503, json: { error: { message: "Tijdelijk niet beschikbaar" } } });
      let rows = shops.filter(s => !url.searchParams.get("search") || s.name.toLowerCase().includes(url.searchParams.get("search")!.toLowerCase()));
      if (url.searchParams.has("category")) rows = rows.filter(s => s.categories[0].key === url.searchParams.get("category"));
      if (url.searchParams.has("has_offers")) {
        expect(url.searchParams.get("has_offers")).toBe("1");
        rows = rows.filter(s => s.offer_count > 0);
      }
      if (url.searchParams.get("sort") === "most_offers") rows = [...rows].sort((a, b) => b.offer_count - a.offer_count);
      const current = Number(url.searchParams.get("page") || 1);
      return route.fulfill({ json: { data: rows.slice((current - 1) * 12, current * 12), meta: { current_page: current, last_page: Math.max(1, Math.ceil(rows.length / 12)), per_page: 12, total: rows.length } } });
    }
    return route.fulfill({ status, json: status >= 400 ? { error: { message: "Niet beschikbaar" } } : { data } });
  });
  return state;
}

const cards = (page: Page) => page.locator('main a[href^="/webshops/shop-"]');

test("desktop has three columns, public links and guest CTA", async ({ page }) => {
  await fixtures(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/webshops");
  await expect(cards(page)).toHaveCount(12);
  const boxes = await cards(page).evaluateAll(nodes => nodes.slice(0, 4).map(n => n.getBoundingClientRect().toJSON()));
  expect(boxes[0].y).toBe(boxes[2].y);
  expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
  await expect(page.getByText("Bekijk jouw tegoed en vouchers")).toBeVisible();
  await page.screenshot({ path: "test-results/discovery-desktop.png", fullPage: true });
});

test("mobile has one column without horizontal overflow", async ({ page }) => {
  await fixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/webshops");
  await expect(cards(page)).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const boxes = await cards(page).evaluateAll(nodes => nodes.slice(0, 2).map(n => n.getBoundingClientRect().toJSON()));
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
  await page.screenshot({ path: "test-results/discovery-mobile.png", fullPage: true });
});

test("combined filters serialize the has-offers contract", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/webshops");
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole("button", { name: "Wonen", exact: true }).click();
  await page.getByRole("button", { name: "Met actieve aanbieding" }).click();
  await page.getByRole("combobox").selectOption("name");
  await expect.poll(() => state.requests.at(-1)?.searchParams.toString()).toContain("has_offers=1");
  await expect.poll(() => state.requests.at(-1)?.searchParams.get("sort")).toBe("name");
  expect(state.requests.at(-1)?.searchParams.get("category")).toBe("home_living");
});

test("search is debounced and clearing empty results restores cards", async ({ page }) => {
  await fixtures(page);
  await page.goto("/webshops");
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole("textbox", { name: "Zoek een webshop" }).fill("no-match");
  await expect(page.getByRole("heading", { name: "Geen webshops gevonden" })).toBeVisible();
  await page.getByRole("button", { name: "Wis filters" }).click();
  await expect(cards(page)).toHaveCount(12);
});

test("Back and Forward restore search, category, offers, sort and page without loops", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/webshops?q=Shop&category=home_living&has_offers=1&sort=name&page=2");
  await expect(page.getByRole("textbox")).toHaveValue("Shop");
  await expect(page.getByText("Pagina 2 van 2")).toBeVisible();
  await page.getByRole("button", { name: "Mode", exact: true }).click();
  await expect(page).toHaveURL(/category=fashion/);
  await page.goBack();
  await expect(page).toHaveURL(/category=home_living.*page=2/);
  await expect(page.getByRole("button", { name: "Wonen", exact: true })).toHaveClass(/bg-brand /);
  await expect(page.getByRole("button", { name: "Met actieve aanbieding" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox")).toHaveValue("name");
  await page.waitForTimeout(700);
  expect(state.requests.at(-1)?.searchParams.get("page")).toBe("2");
  const count = state.requests.length;
  await page.waitForTimeout(700);
  expect(state.requests.length).toBe(count);
  await page.goForward();
  await expect(page).toHaveURL(/category=fashion/);
  await expect(page.getByRole("button", { name: "Mode", exact: true })).toHaveClass(/bg-brand /);
});

test("direct page two survives debounce and pagination is functional", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/webshops?page=2&sort=name");
  await expect(page.getByText("Pagina 2 van 5")).toBeVisible();
  await page.waitForTimeout(500);
  expect(state.requests.at(-1)?.searchParams.get("page")).toBe("2");
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.getByText("Pagina 3 van 5")).toBeVisible();
  await expect(cards(page)).toHaveCount(12);
});

test("broken covers and logos use fallbacks", async ({ page }) => {
  await fixtures(page);
  await page.goto("/webshops?sort=name");
  await expect(cards(page)).toHaveCount(12);
  await expect(cards(page).first().locator("img")).toHaveCount(0);
  await expect(cards(page).first().getByRole("heading")).toHaveText("Shop 00");
});

test("directory errors expose retry and recover", async ({ page }) => {
  const state = await fixtures(page);
  state.failDirectory = true;
  await page.goto("/webshops");
  await expect(page.getByRole("heading", { name: "Kon webshops niet laden" })).toBeVisible();
  state.failDirectory = false;
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await expect(cards(page)).toHaveCount(12);
});

test("voucher failure is not displayed as zero activity", async ({ page }) => {
  const state = await fixtures(page, { loggedIn: true, voucherError: true, voucherDelay: 1000 });
  await page.goto("/webshops");
  await expect(page.getByText("Vouchers laden…", { exact: true })).toBeVisible();
  await expect(page.getByText("Vouchers niet beschikbaar", { exact: true })).toBeVisible();
  await expect(page.getByText("0 actieve vouchers", { exact: true })).toHaveCount(0);
  expect(state.voucherRequests).toBe(1);
});

test("shared lifecycle refresh updates voucher summary with one request", async ({ page }) => {
  const state = await fixtures(page, { loggedIn: true });
  await page.goto("/webshops");
  await expect(page.getByText("2 actieve vouchers", { exact: true })).toBeVisible();
  expect(state.voucherRequests).toBe(1);
  state.voucherCount = 3;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("3 actieve vouchers", { exact: true })).toBeVisible();
  expect(state.voucherRequests).toBe(2);
});
