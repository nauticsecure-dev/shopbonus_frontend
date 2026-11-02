# Notification links and template UI — 2026-11-02

Scope: the remaining email destination configuration and template UI work for card #29. This is not acceptance of the entire notification system.

## Hassan destination review

These defaults match page files in this checkout. Hassan still needs to confirm the intended production landing pages and `FRONTEND_URL` against the deployed application.

| Email source | Default destination | Backend environment variable |
| --- | --- | --- |
| `/app/benefits` | `/mijn-voordelen` | `NOTIFICATION_BENEFITS_PATH` |
| `/app/workspaces?workspace=…` | `/dashboard?workspace=…` | `NOTIFICATION_WORKSPACE_PATH` |
| `/app/platform` | `/admin` | `NOTIFICATION_PLATFORM_PATH` |
| `/app/support?conversation=…` (consumer) | `/app/support?conversation=…` | `NOTIFICATION_SUPPORT_PATH` |
| `/app/support?conversation=…` (workspace) | `/dashboard/support?conversation=…&workspace=…` | `NOTIFICATION_WORKSPACE_SUPPORT_PATH` |

Configuration: `shopbonus_backend/config/notifications.php`. Deployment overrides must be absolute internal paths without an origin, query, or fragment. Workspace/conversation context comes from the notification. HTML and text emails use the same mapping, including historical notifications rendered after this change. Set `FRONTEND_URL` to the approved frontend origin and rebuild Laravel's config cache through the normal deployment process. No deployment or live configuration was changed here.

Confirm authenticated navigation after an email click, including a user with multiple workspaces and a support conversation in a workspace other than the currently selected one. The four generic audience landing pages remain deliberate review points; this patch does not invent event-specific detail routes.

## Template UI

At `/app/platform/notifications`, Templates now supports editing title, body, and action label, with limits, allowed variables, and an audit reason. Save uses the existing checksum-aware API to create a new draft version. A stale edit stays in the form with the server error. A successful save clears the previous test preview. Test renders a readable synthetic preview under the tested version and sends no customer email. Existing independent publication and rollback APIs remain responsible for activation. Existing admin password/OTP confirmation is available when the session requires it.

The editor uses the existing NL/EN locale context. Template content retains its own locale, shown in the version key. No template was generated, published, or sent to a customer during this work.

## Verification

Focused backend tests and frontend static checks are recorded in the backend handoff. Browser tests use intercepted API fixtures, including save/version/checksum, test preview without publication, stale edits, and expired confirmation. They are UI contract evidence, not real email-provider or production authentication evidence.

Hassan's production destination sign-off, actual email transport checks, and the full ten business-event E2E journeys remain pending.
Browser harness note: all three cases reported ok, but Playwright remained waiting during Windows webServer teardown after port 3327 had closed. The wrapper was interrupted after completion; no clean aggregate runner exit is claimed. Test assertions passed; server teardown needs follow-up if this dedicated config is used in CI.
