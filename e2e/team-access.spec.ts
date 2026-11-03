import { test, expect, type Page } from "@playwright/test";

// Controlled UI contract tests. Live sessions/providers/realtime require separate acceptance.
async function setup(page: Page, actor = "owner", permissions = ["team.view", "team.manage", "orders.view", "ownership.manage", "finance.manage"]) {
  const state = { shop: "shop", revoked: false, invitations: [] as Record<string, unknown>[], updates: [] as Record<string, unknown>[], actions: [] as string[], transfer: null as Record<string, unknown> | null };
  const members = [
    { id: "owner", first_name: "Sanne", email: "owner@example.test", role: "owner", status: "active", permissions, granted_permissions: [], last_activity_at: null },
    { id: "employee", first_name: "Emma", email: "employee@example.test", role: "employee", status: "active", permissions: ["dashboard.view"], granted_permissions: [], last_activity_at: null },
  ];
  await page.addInitScript(() => { localStorage.setItem("shopbonus-locale", "nl"); localStorage.setItem("shopbonus-locale-explicit", "1"); });
  await page.route("**/sanctum/csrf-cookie", (r) => r.fulfill({ status: 204 }));
  await page.route("**/user/confirm-password", (r) => { state.actions.push("password"); return r.fulfill({ json: {} }); });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return route.fulfill({ status: 204 });
    if (path.endsWith("/me")) return route.fulfill({ json: { data: {
      id: actor, first_name: "Sanne", email: `${actor}@example.test`, email_verified: true, status: "active", role: "merchant", onboarding_intent: "merchant", roles: [], destination: "workspace", locale: "nl", two_factor_enabled: false, support_session: null,
      workspaces: ["shop", "shop2"].filter((id) => !state.revoked || id !== "shop").map((id) => ({ id, name: id === "shop" ? "Workspace A" : "Workspace B", status: "approved", role: actor, is_current: id === state.shop })),
    } } });
    if (path.endsWith("/select")) { state.shop = path.split("/")[4]; return route.fulfill({ json: { data: {} } }); }
    if (/\/workspaces\/shop2?\/?$/.test(path)) return route.fulfill({ json: { data: { membership: { role: actor, permissions } } } });
    if (path.endsWith("/members")) return route.fulfill({ json: { data: path.includes("/shop2/") ? members.map((m) => ({ ...m, email: m.email.replace("@", "-b@") })) : members } });
    if (path.endsWith("/members/employee")) { state.updates.push(route.request().postDataJSON()); return route.fulfill({ json: { data: members[1] } }); }
    if (path.endsWith("/invitations")) {
      if (method === "POST") state.invitations.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: method === "POST" ? {} : [] } });
    }
    if (path.endsWith("/access-history")) return route.fulfill({ json: { data: [{ action: "team.member_updated", occurred_at: "2026-11-03T00:00:00Z", outcome: "success" }], meta: { current_page: 1, last_page: 1 } } });
    if (path.includes("/ownership-transfer")) {
      if (method !== "GET") {
        state.actions.push(method === "DELETE" ? "cancel" : path.endsWith("/accept") ? "accept" : "start");
        state.transfer = { id: "transfer", status: method === "DELETE" ? "cancelled" : path.endsWith("/accept") ? "accepted" : "pending", from: { id: "owner", first_name: "Sanne" }, to: { id: "employee", first_name: "Emma" }, expires_at: "2099-11-04T00:00:00Z" };
      }
      return route.fulfill({ json: { data: state.transfer } });
    }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  return state;
}

test("invitation requires review and sends only selected held grants", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/dashboard/team");
  await page.getByPlaceholder("collega@bedrijf.nl").fill("NEW@example.test");
  const invite = page.getByRole("heading", { name: "Uitnodigen", exact: true }).locator("..");
  await invite.getByRole("checkbox", { name: "Bestellingen bekijken", exact: true }).check();
  await expect(invite.getByRole("checkbox", { name: "Financiën beheren" })).toHaveCount(0);
  await page.getByRole("button", { name: "Uitnodiging controleren", exact: true }).click();
  expect(state.invitations).toHaveLength(0);
  await expect(page.getByRole("region", { name: "Uitnodiging controleren" })).toContainText("new@example.test");
  await page.getByRole("button", { name: "Uitnodiging bevestigen en versturen" }).click();
  await expect.poll(() => state.invitations.length).toBe(1);
  expect(state.invitations[0]).toEqual({ email: "new@example.test", role: "employee", permissions: ["orders.view"] });
});

test("permission editor saves grants and displays audit history", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/dashboard/team");
  await page.getByRole("button", { name: "Rechten bewerken" }).click();
  const member = page.getByRole("listitem").filter({ hasText: "employee@example.test" });
  await member.getByRole("checkbox", { name: "Bestellingen bekijken", exact: true }).check();
  await member.getByRole("button", { name: "Rechten opslaan" }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  expect(state.updates[0]).toEqual({ permissions: ["orders.view"] });
  await expect(page.getByText("Lid bijgewerkt · Geslaagd")).toBeVisible();
  await page.screenshot({ path: "docs/workspace-access-desktop.png", fullPage: true });
});

test("effective permissions hide management despite owner role label", async ({ page }) => {
  await setup(page, "owner", ["team.view"]);
  await page.goto("/dashboard/team");
  await expect(page.getByText("employee@example.test")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rechten bewerken" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Uitnodigen", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Toegangsgeschiedenis" })).toHaveCount(0);
});

test("owner confirms password before initiating and can cancel transfer", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/dashboard/team");
  await page.getByLabel("Nieuwe owner", { exact: true }).selectOption("employee");
  await page.getByLabel("Bevestig je wachtwoord", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Overdracht starten" }).click();
  await expect(page.getByRole("button", { name: "Overdracht annuleren" })).toBeVisible();
  expect(state.actions).toEqual(["password", "start"]);
  await page.getByRole("button", { name: "Overdracht annuleren" }).click();
  await expect.poll(() => state.actions.at(-1)).toBe("cancel");
});

test("recipient accepts pending transfer after password confirmation on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, "employee", ["dashboard.view"]);
  state.transfer = { id: "transfer", status: "pending", from: { id: "owner", first_name: "Sanne" }, to: { id: "employee", first_name: "Emma" }, expires_at: "2099-11-04T00:00:00Z" };
  await page.goto("/dashboard/team");
  await page.getByLabel("Bevestig je wachtwoord", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Eigendom accepteren" }).click();
  await expect.poll(() => state.actions).toEqual(["password", "accept"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "docs/workspace-access-mobile.png", fullPage: true });
});


test("workspace switching clears draft and previous member data", async ({ page }) => {
  await setup(page);
  await page.goto("/dashboard/team");
  await page.getByPlaceholder("collega@bedrijf.nl").fill("old-draft@example.test");
  await page.getByText("Workspace A", { exact: true }).first().click();
  await page.getByRole("button", { name: /Workspace B/ }).click();
  await expect(page.getByText("employee-b@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("employee@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder("collega@bedrijf.nl")).toHaveValue("");
});

test("membership revalidation falls back without previous workspace state", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/dashboard/team");
  await page.getByPlaceholder("collega@bedrijf.nl").fill("old-draft@example.test");
  state.revoked = true;
  await page.evaluate(() => window.dispatchEvent(new Event("shopbonus:workspace-access-check")));
  await expect(page.getByText("employee-b@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("employee@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder("collega@bedrijf.nl")).toHaveValue("");
});
