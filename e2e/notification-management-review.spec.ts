import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, stepup = false) {
  await page.context().addCookies([{ name: "XSRF-TOKEN", value: "notification-management-fixture", url: test.info().project.use.baseURL! }]);
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const pages = { templates: [] as number[], deliveries: [] as number[] };
  let confirmed = false;
  let status = "uncertain";
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "en"));
  await page.route("**/sanctum/csrf-cookie", r => r.fulfill({ status: 204 }));
  await page.route("**/user/confirm-password", r => r.fulfill({ json: {} }));
  await page.route("**/api/v1/**", async r => {
    const req = r.request(), url = new URL(req.url()), path = url.pathname;
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204 });
    if (path === "/api/v1/me") return r.fulfill({ json: { data: {
      id: "admin", first_name: "Admin", email: "admin@example.test", email_verified: true,
      status: "active", role: "super_admin", roles: ["super_admin"], destination: "admin",
      workspaces: [], locale: "en", two_factor_enabled: true, support_session: null,
    } } });
    if (path.endsWith("/step-up/code")) return r.fulfill({ json: { data: { sent: true } } });
    if (path.endsWith("/step-up/verify")) { confirmed = true; return r.fulfill({ json: { data: { confirmed: true } } }); }
    if (path.endsWith("/retry") || path.endsWith("/resolve")) {
      writes.push({ path, body: req.postDataJSON() });
      if (stepup && !confirmed) return r.fulfill({ status: 423, json: { error: { code: "password_confirmation_required", message: "Confirm password" } } });
      status = path.endsWith("/retry") ? "retry" : req.postDataJSON().outcome === "confirmed_sent" ? "confirmed_sent" : "skipped";
      return r.fulfill({ json: { data: {} } });
    }
    if (path.endsWith("/templates")) {
      const n = Number(url.searchParams.get("page") || 1); pages.templates.push(n);
      return r.fulfill({ json: { data: [{ id: "tpl-" + n, key: "notifications.template.cashback_credited.en", version: n, status: "published", value: { title: "Template page " + n }, is_current: false }], meta: { current_page: n, total: 51 } } });
    }
    if (path.endsWith("/deliveries")) {
      const n = Number(url.searchParams.get("page") || 1); pages.deliveries.push(n);
      return r.fulfill({ json: { data: [{ id: "delivery-" + n, channel: "email", status, attempts: 1, error_code: null, sent_at: null }], meta: { current_page: n, total: 26 }, operations: { failed_events: 0, locale_fallbacks: 0 } } });
    }
    if (path.endsWith("/events")) return r.fulfill({ json: { data: [], failures: [] } });
    if (path.endsWith("/settings")) return r.fulfill({ json: { data: {}, email_delivery_available: true } });
    return r.fulfill({ json: { data: [], meta: { total: 0, unread_count: 0, current_page: 1 } } });
  });
  await page.goto("/app/platform/notifications");
  await page.getByTestId("platform-notifications-tab-deliveries").click();
  await expect(page.getByTestId("delivery-actions-delivery-1")).toBeVisible();
  return { writes, pages };
}

test("pagination reaches older templates and deliveries and retains independent pages", async ({ page }) => {
  const state = await setup(page);
  const deliveries = page.getByRole("navigation", { name: "Delivery logs" });
  await deliveries.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByTestId("delivery-actions-delivery-2")).toBeVisible();
  await expect(deliveries.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByTestId("platform-notifications-tab-templates").click();
  const templates = page.getByRole("navigation", { name: "Template versions" });
  await templates.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Template page 2", { exact: true })).toBeVisible();
  await expect(templates.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByTestId("platform-notifications-tab-deliveries").click();
  await expect(page.getByTestId("delivery-actions-delivery-2")).toBeVisible();
  await deliveries.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByTestId("delivery-actions-delivery-1")).toBeVisible();
  expect(state.pages.templates).toContain(2); expect(state.pages.deliveries).toContain(2);
});

test("uncertain retry requires an explicit acknowledgement and review note", async ({ page }) => {
  const state = await setup(page);
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeDisabled();
  await page.getByRole("textbox", { name: "Review note", exact: false }).fill("Reviewed provider timeout and accepted duplicate risk");
  await expect(retry).toBeDisabled();
  expect(state.writes).toHaveLength(0);
  await page.getByRole("checkbox", { name: "I understand that retrying may send a duplicate email." }).check();
  await retry.click();
  await expect(page.getByText("Delivery retry authorized.", { exact: true })).toBeVisible();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body).toMatchObject({ duplicate_risk_acknowledged: true, note: "Reviewed provider timeout and accepted duplicate risk" });
});

for (const [label, outcome] of [["Confirm sent", "confirmed_sent"], ["Do not resend", "do_not_resend"]]) {
  test("resolution: " + outcome + " keeps explicit review through step-up", async ({ page }) => {
    const state = await setup(page, true);
    const action = page.getByRole("button", { name: label, exact: true });
    await expect(action).toBeDisabled();
    await page.getByRole("textbox", { name: "Review note", exact: false }).fill("Provider records reviewed by administrator");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await action.click();
    await page.getByTestId("admin-stepup-password").fill("fixture-password");
    await page.getByRole("button", { name: "Doorgaan naar e-mailcode" }).click();
    await page.getByTestId("admin-stepup-otp").fill("123456");
    await page.getByRole("button", { name: "Bevestigen", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(2);
    expect(state.writes[1].body).toEqual({ outcome, note: "Provider records reviewed by administrator" });
    await expect(page.getByText("Delivery resolved", { exact: true })).toBeVisible();
    await expect(page.getByTestId("delivery-actions-delivery-1")).toHaveCount(0);
  });
}
