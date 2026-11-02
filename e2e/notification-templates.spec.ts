import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, conflict: boolean | "stepup" = false) {
  const state = { edits: [] as Record<string, unknown>[], tests: 0, publishes: 0 };
  let confirmed = false;
  let template = { id: "template-fixture", key: "notifications.template.cashback_credited.en", version: 1, status: "draft",
    value: { title: "Credit received", body: "You received {{amount_formatted}}.", action_label: "View benefits" },
    checksum: "a".repeat(64), is_current: false, published_at: null, rollback_of: null };
  await page.addInitScript(() => localStorage.setItem("shopbonus-locale", "en"));
  await page.route("**/sanctum/csrf-cookie", route => route.fulfill({ status: 204 }));
  await page.route("**/user/confirm-password", route => route.fulfill({ json: {} }));
  await page.route("**/api/v1/**", async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path.endsWith("/step-up/code")) return route.fulfill({ json: { data: { sent: true, expires_at: "2026-11-02T12:00:00Z" } } });
    if (path.endsWith("/step-up/verify")) { confirmed = true; return route.fulfill({ json: { data: { confirmed: true } } }); }
    if (path === "/api/v1/me") return route.fulfill({ json: { data: {
      id: "admin", first_name: "Admin", email: "admin@example.test", email_verified: true,
      status: "active", role: "super_admin", roles: ["super_admin"], destination: "admin",
      workspaces: [], locale: "en", two_factor_enabled: true, support_session: null,
    } } });
    if (path.endsWith("/templates")) return route.fulfill({ json: { data: [template], meta: { current_page: 1, total: 1 } } });
    if (path.endsWith("/events")) return route.fulfill({ json: { data: [{ event_type: "cashback_credited", audience: "consumer", allowed_variables: ["amount_formatted"], reminder_days: [] }], failures: [] } });
    if (path.endsWith("/deliveries")) return route.fulfill({ json: { data: [], operations: { failed_events: 0, locale_fallbacks: 0 } } });
    if (path.endsWith("/settings")) return route.fulfill({ json: { data: {}, email_delivery_available: false } });
    if (req.method() === "PUT") {
      const input = req.postDataJSON(); state.edits.push(input);
      if (conflict === "stepup" && !confirmed) return route.fulfill({ status: 423, json: { error: { message: "Confirm password", code: "password_confirmation_required" } } });
      if (conflict === true) return route.fulfill({ status: 409, json: { error: { message: "Template changed. Refresh before editing.", code: "notification_template_stale" } } });
      template = { ...template, id: "saved-fixture", version: 2, value: input.value, checksum: "b".repeat(64) };
      return route.fulfill({ status: 201, json: { data: template } });
    }
    if (path.endsWith("/test")) { state.tests++;
      return route.fulfill({ json: { data: { failed: 0, synthetic: true, preview: { ...template.value, body: "You received €7.00." } } } });
    }
    if (path.endsWith("/publish")) state.publishes++;
    return route.fulfill({ json: { data: [], meta: { total: 0, unread_count: 0, current_page: 1 } } });
  });
  await page.goto("/app/platform/notifications");
  await page.getByTestId("platform-notifications-tab-templates").click();
  await expect(page.getByText("Credit received", { exact: true })).toBeVisible();
  return state;
}

test("save a versioned draft then test a readable preview without publishing", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Edit as new draft" }).click();
  await expect(page.getByText("{{amount_formatted}}", { exact: false }).last()).toBeVisible();
  await page.getByLabel("Title (", { exact: false }).fill("Your credit is ready");
  await page.getByLabel("Reason for change").fill("Improve title clarity");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Your credit is ready", { exact: true })).toBeVisible();
  expect(state.edits[0]).toMatchObject({ expected_checksum: "a".repeat(64), reason: "Improve title clarity", value: { title: "Your credit is ready" } });
  await page.getByRole("button", { name: "Test", exact: true }).click();
  await expect(page.getByRole("region", { name: "Test preview" })).toContainText("You received €7.00.");
  expect(state.tests).toBe(1); expect(state.publishes).toBe(0);
  await page.screenshot({ path: "docs/notification-template-preview.png", fullPage: true });
});

test("expired confirmation resumes draft saving after password and OTP", async ({ page }) => {
  const state = await setup(page, "stepup");
  await page.getByRole("button", { name: "Edit as new draft" }).click();
  await page.getByLabel("Title (", { exact: false }).fill("Confirmed draft");
  await page.getByLabel("Reason for change").fill("Reviewed wording update");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByTestId("admin-stepup-password").fill("fixture-password");
  await page.getByRole("button", { name: "Doorgaan naar e-mailcode" }).click();
  await page.getByTestId("admin-stepup-otp").fill("123456");
  await page.getByRole("button", { name: "Bevestigen", exact: true }).click();
  await expect(page.getByText("Confirmed draft", { exact: true })).toBeVisible();
  expect(state.edits).toHaveLength(2);
  expect(state.publishes).toBe(0);
});

test("stale edit keeps input and shows server conflict", async ({ page }) => {
  await setup(page, true);
  await page.getByRole("button", { name: "Edit as new draft" }).click();
  await page.getByLabel("Title (", { exact: false }).fill("Unsaved title");
  await page.getByLabel("Reason for change").fill("Improve title clarity");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Template changed" })).toBeVisible();
  await expect(page.getByLabel("Title (", { exact: false })).toHaveValue("Unsaved title");
});
