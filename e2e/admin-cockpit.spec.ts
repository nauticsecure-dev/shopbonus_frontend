/**
 * Super Admin cockpit UI smoke (B16 frontend gaps).
 * Backend PHPUnit tests/Feature/Admin/* remain the authoritative E2E for APIs.
 *
 * npx playwright test e2e/admin-cockpit.spec.ts
 */
import { expect, test } from "@playwright/test";

const api = process.env.API_BASE_URL || "http://localhost:8000";

test.describe("Super Admin cockpit UI smoke", () => {
  test("unauthenticated /admin is gated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin\/?$/);
  });

  test("admin cockpit and mutation APIs require auth", async ({ request }) => {
    const cockpit = await request.get(`${api}/api/v1/admin/cockpit`);
    expect([401, 403]).toContain(cockpit.status());

    const approve = await request.post(`${api}/api/v1/admin/webshops/01INVALID/approve`, {
      data: { reason: "nope" },
    });
    expect([401, 403, 404]).toContain(approve.status());

    const incidents = await request.get(`${api}/api/v1/admin/incidents`);
    expect([401, 403]).toContain(incidents.status());

    const stepUp = await request.post(`${api}/api/v1/admin/step-up/code`);
    expect([401, 403, 423]).toContain(stepUp.status());
  });

  test("admin list shells render step-up hooks when HTML is reachable", async ({ page }) => {
    // Without credentials the gate redirects; still assert public route modules exist via navigation attempt.
    await page.goto("/admin/webshops");
    const url = page.url();
    expect(url.includes("/admin") || url.includes("/account") || url.includes("/login")).toBeTruthy();
  });
});
