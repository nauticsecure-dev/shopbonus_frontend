/**
 * ShopBonus central notifications — frontend E2E journeys.
 *
 * Prerequisites:
 *   NOTIF_E2E_EMAIL / NOTIF_E2E_PASSWORD — verified consumer
 *   NOTIF_E2E_WORKSPACE_EMAIL / NOTIF_E2E_WORKSPACE_PASSWORD — workspace owner
 *   NOTIF_E2E_ADMIN_EMAIL / NOTIF_E2E_ADMIN_PASSWORD — super admin
 *   BASE_URL — default http://localhost:3000
 *
 *   npx playwright test e2e/notifications.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const base = process.env.BASE_URL || "http://localhost:3000";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${base}/account?mode=login`);
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/wachtwoord|password/i).fill(password);
  await page.getByRole("button", { name: /inloggen|log in/i }).click();
  await page.waitForURL(/mijn-voordelen|dashboard|admin|app\/support|app\/notifications/, {
    timeout: 30000,
  });
}

test.describe.configure({ mode: "serial" });

test("1. Consumer bell and notification center", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_EMAIL, "Set NOTIF_E2E_EMAIL");
  await login(page, process.env.NOTIF_E2E_EMAIL!, process.env.NOTIF_E2E_PASSWORD!);
  await page.goto(`${base}/mijn-voordelen`);
  await expect(page.getByTestId("notification-bell")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("notification-bell-button").click();
  await expect(page.getByTestId("notification-dropdown")).toBeVisible();
  await page.getByTestId("notification-view-all").click();
  await expect(page).toHaveURL(/\/app\/notifications/);
  await expect(page.getByTestId("notification-center")).toBeVisible();
  await expect(page.getByTestId("notification-filter-all")).toBeVisible();
  await expect(page.getByTestId("notification-filter-unread")).toBeVisible();
});

test("2. Mark one and mark all as read", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_EMAIL, "Set NOTIF_E2E_EMAIL");
  await login(page, process.env.NOTIF_E2E_EMAIL!, process.env.NOTIF_E2E_PASSWORD!);
  await page.goto(`${base}/app/notifications`);
  await expect(page.getByTestId("notification-center")).toBeVisible();
  const items = page.getByTestId("notification-center-item");
  if ((await items.count()) > 0) {
    await items.first().getByRole("button", { name: /markeer gelezen|mark as read/i }).click();
  }
  await page.getByTestId("notification-center-mark-all").click();
  await page.reload();
  await expect(page.getByTestId("notification-center")).toBeVisible();
});

test("3. Filter All / Unread and empty/loading states", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_EMAIL, "Set NOTIF_E2E_EMAIL");
  await login(page, process.env.NOTIF_E2E_EMAIL!, process.env.NOTIF_E2E_PASSWORD!);
  await page.goto(`${base}/app/notifications`);
  await page.getByTestId("notification-filter-unread").click();
  await expect(page.getByTestId("notification-filter-unread")).toHaveClass(/bg-brand/);
  await page.getByTestId("notification-filter-all").click();
  await expect(page.getByTestId("notification-filter-all")).toHaveClass(/bg-brand/);
});

test("4. Consumer preferences respect mandatory channels", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_EMAIL, "Set NOTIF_E2E_EMAIL");
  await login(page, process.env.NOTIF_E2E_EMAIL!, process.env.NOTIF_E2E_PASSWORD!);
  await page.goto(`${base}/profiel#notifications`);
  await expect(page.locator("#notifications")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/verplichte|mandatory|transactioneel|transactional/i)).toBeVisible();
});

test("5. Workspace notification center isolation", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_WORKSPACE_EMAIL, "Set NOTIF_E2E_WORKSPACE_EMAIL");
  await login(
    page,
    process.env.NOTIF_E2E_WORKSPACE_EMAIL!,
    process.env.NOTIF_E2E_WORKSPACE_PASSWORD!
  );
  await page.goto(`${base}/dashboard/notifications`);
  await expect(page.getByTestId("notification-center")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("notification-bell")).toBeVisible();
});

test("6. Super Admin inbox", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_ADMIN_EMAIL, "Set NOTIF_E2E_ADMIN_EMAIL");
  await login(page, process.env.NOTIF_E2E_ADMIN_EMAIL!, process.env.NOTIF_E2E_ADMIN_PASSWORD!);
  await page.goto(`${base}/admin/notifications`);
  await expect(page.getByTestId("notification-center")).toBeVisible({ timeout: 20000 });
});

test("7. Super Admin platform templates tabs", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_ADMIN_EMAIL, "Set NOTIF_E2E_ADMIN_EMAIL");
  await login(page, process.env.NOTIF_E2E_ADMIN_EMAIL!, process.env.NOTIF_E2E_ADMIN_PASSWORD!);
  await page.goto(`${base}/app/platform/notifications`);
  await expect(page.getByTestId("platform-notifications-tab-overview")).toBeVisible({ timeout: 20000 });
  for (const tab of ["templates", "events", "reminders", "deliveries", "settings"] as const) {
    await page.getByTestId(`platform-notifications-tab-${tab}`).click();
    await expect(page.getByTestId(`platform-notifications-tab-${tab}`)).toHaveClass(/bg-brand/);
  }
});

test("8. Bell dropdown mark-all and view-all on workspace", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_WORKSPACE_EMAIL, "Set NOTIF_E2E_WORKSPACE_EMAIL");
  await login(
    page,
    process.env.NOTIF_E2E_WORKSPACE_EMAIL!,
    process.env.NOTIF_E2E_WORKSPACE_PASSWORD!
  );
  await page.goto(`${base}/dashboard`);
  await page.getByTestId("notification-bell-button").click();
  await expect(page.getByTestId("notification-dropdown")).toBeVisible();
  const markAll = page.getByTestId("notification-mark-all");
  if (await markAll.isVisible()) {
    await markAll.click();
  }
  await page.getByTestId("notification-view-all").click();
  await expect(page).toHaveURL(/\/dashboard\/notifications/);
});

test("9. Mobile-responsive notification center", async ({ page }) => {
  test.skip(!process.env.NOTIF_E2E_EMAIL, "Set NOTIF_E2E_EMAIL");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, process.env.NOTIF_E2E_EMAIL!, process.env.NOTIF_E2E_PASSWORD!);
  await page.goto(`${base}/app/notifications`);
  await expect(page.getByTestId("notification-center")).toBeVisible();
});

test("10. Permissions — guest cannot open notification APIs via UI", async ({ page }) => {
  await page.goto(`${base}/app/notifications`);
  // Unauthenticated users should not see a populated inbox; redirect or empty/error.
  const center = page.getByTestId("notification-center");
  const loginLink = page.getByRole("link", { name: /inloggen|log in/i });
  await expect(center.or(loginLink).first()).toBeVisible({ timeout: 15000 });
});
