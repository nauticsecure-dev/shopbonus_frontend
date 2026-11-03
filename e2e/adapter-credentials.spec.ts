import { test, expect } from "@playwright/test";

const cases = [
  { platform: "lightspeed_e", fields: { "E-Series / Ecwid store ID": "1003", "Store access token": "SYNTHETIC_store_token", "App client secret": "SYNTHETIC_client_secret" }, body: { store_id: "1003", access_token: "SYNTHETIC_store_token", client_secret: "SYNTHETIC_client_secret" } },
  { platform: "squarespace", fields: { "Squarespace website ID": "5863f6faf7e0abc3cf95ce3a", "Orders read API key": "SYNTHETIC_squarespace_key" }, body: { website_id: "5863f6faf7e0abc3cf95ce3a", api_key: "SYNTHETIC_squarespace_key" } },
  { platform: "prestashop", fields: { "Verified HTTPS installation URL": "https://shop.example.com", "Read-only Webservice key": "SYNTHETIC_webservice_key", "PrestaShop shop ID": "2", "Store timezone (for example Europe/Amsterdam)": "Europe/Amsterdam" }, body: { store_url: "https://shop.example.com", webservice_key: "SYNTHETIC_webservice_key", shop_id: "2", timezone: "Europe/Amsterdam" } },
];

for (const fixture of cases) {
  test(`${fixture.platform} merchant form submits the native credential contract and clears secrets`, async ({ page }) => {
    await page.context().addCookies([{ name: "XSRF-TOKEN", value: "synthetic-csrf", url: process.env.BASE_URL || "http://localhost:3000" }]);
    await page.addInitScript(() => {
      localStorage.setItem("shopbonus-locale", "en");
      localStorage.setItem("shopbonus-locale-explicit", "1");
    });
    const sent: Record<string, unknown>[] = [];
    let created = false;
    const connection = { id: "connection", platform: fixture.platform, status: "setup_required", limitations: [], setup: { steps: ["Synthetic native provider setup"], webhook_url: "https://api.example.com/api/v1/webhooks/example" } };
    await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.endsWith("/me")) data = { id: "owner", first_name: "Sanne", email: "owner@example.test", email_verified: true, status: "active", role: "merchant", onboarding_intent: "merchant", roles: [], destination: "workspace", two_factor_enabled: true, support_session: null, locale: "nl", workspaces: [{ id: "shop", name: "Synthetic Shop", status: "approved", role: "owner", is_current: true }] };
      else if (path.endsWith("/onboarding")) data = { webshop_status: "approved", next_step: null };
      else if (path.endsWith("/integrations/platforms")) data = [{ platform: fixture.platform, name: fixture.platform, available: true, verification: "unverified", limitations: [], capabilities: {} }];
      else if (path.endsWith("/connections") && route.request().method() === "POST") {
        sent.push(route.request().postDataJSON()); created = true; data = connection;
      } else if (path.endsWith("/connections")) data = created ? [connection] : [];
      else if (path.endsWith("/verify")) data = { checks: {}, missing_gates: ["native_api"], next_action: "place_test_order" };
      else if (path.endsWith("/health")) data = null;
      else if (path.endsWith("/connections/connection")) data = connection;
      return route.fulfill({ json: { data, meta: { current_page: 1, last_page: 1, total: 0 } } });
    });
    await page.goto(`/dashboard/app-store?platform=${fixture.platform}`);
    for (const [label, value] of Object.entries(fixture.fields)) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toEqual({ platform: fixture.platform, ...fixture.body });
    for (const label of Object.keys(fixture.fields)) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    await expect(page.getByText("Remaining gates: native_api")).toBeVisible();
    if (fixture.platform === "prestashop") {
      await expect(page.getByRole("link", { name: "Download candidate connector ZIP" })).toHaveAttribute("href", "https://api.example.com/downloads/integrations/shopbonus-prestashop9.zip");
    }
  });
}
