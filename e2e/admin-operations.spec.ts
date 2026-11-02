import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const cockpit = JSON.parse(readFileSync("e2e/fixtures/admin-cockpit.json", "utf8"));

test("operations shows unknown, failure, restore evidence and clears stale health on refresh", async ({ page }) => {
  let fail = false;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/api/v1/me") return route.fulfill({ json: { data: {
      id: "admin", first_name: "Admin", email: "admin@example.test", email_verified: true,
      status: "active", role: "super_admin", roles: ["super_admin"], destination: "admin",
      workspaces: [], locale: "nl", two_factor_enabled: true, support_session: null,
    } } });
    if (path === "/api/v1/admin/cockpit") return route.fulfill({ json: { data: cockpit } });
    if (path === "/api/v1/admin/operations-overview") {
      if (fail) return route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });
      return route.fulfill({ json: { data: { observed_at: "2026-11-02T09:00:00Z", limits: "Fixture observations only.", components: {
        database: { status: "HEALTHY" }, queue: { status: "CRITICAL", connections: { redis: { queues: { financial: { status: "CRITICAL", size: 12, ready_wait_seconds: null, worker_status: "UNKNOWN" } } } } },
        backups: { status: "WARNING", last_verified_restore_at: "2026-11-01T08:00:00Z" },
        financial: { status: "CRITICAL", discrepancies: 2, run: "synthetic-run" },
      } } } });
    }
    return route.fulfill({ json: { data: [], totals: {}, meta: { total: 0, unread_count: 0 } } });
  });
  await page.goto("/admin");
  await expect(page.getByTestId("operations-database")).toContainText("HEALTHY");
  await expect(page.getByTestId("operations-api")).toContainText("UNKNOWN");
  await expect(page.getByTestId("operations-queue")).toContainText("CRITICAL");
  await expect(page.locator("#operations")).toContainText("2026-11-01T08:00:00Z");
  await expect(page.locator("#operations")).toContainText("UNAPPROVED");
  await page.getByText("Queue observations", { exact: true }).click();
  await expect(page.locator("#operations")).toContainText("financial: CRITICAL");
  await page.screenshot({ path: "docs/admin-operations.png", fullPage: true });
  fail = true;
  await page.getByRole("button", { name: "Refresh operations" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Operations unavailable" })).toBeVisible();
  await expect(page.getByTestId("operations-database")).toContainText("UNKNOWN");
  await expect(page.locator("#operations")).not.toContainText("HEALTHY");
  fail = false;
  await page.getByRole("button", { name: "Refresh operations" }).click();
  await expect(page.getByTestId("operations-database")).toContainText("HEALTHY");
});
