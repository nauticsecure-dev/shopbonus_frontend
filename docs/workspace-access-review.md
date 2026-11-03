# Workspace and team review — 2026-11-03

Status: PARTIAL acceptance. Frontend branch HassanDev, base bd76ff4; backend branch HassanDev, base b92f46a. Changes are uncommitted. Existing unrelated edits are preserved.

Implemented:
- Team management reads effective permissions from GET /workspaces/{workspace}; held team.manage gates management. Member edits respect server role hierarchy and exclude self/owners.
- Permission editor sends supplemental grants using the existing API, excludes owner-only grants, and limits choices to permissions held by the actor. Role permissions are additive and remain active, matching backend semantics.
- Invitations require an explicit review of normalized recipient, role and supplemental grants before POST. Editing the review returns to the draft.
- Ownership initiation, target acceptance, cancellation/decline and refresh use the existing protected workflow. Start/accept confirm the password through Fortify; passwords clear before requests complete. Pending expiry is reflected locally; backend remains authoritative.
- Merchant access history uses a new team.manage-authorized, paginated endpoint projecting only team/ownership actions, timestamps and outcomes from existing audit records. It scopes by resolved workspace and excludes raw metadata/internal IDs/IP hashes. No schema migration.
- Workspace provider unmounts merchant pages during selection and keys the subtree by identity/workspace. This clears component state and runs subscription cleanup. API workspace 403/404 and browser focus revalidate memberships; an unavailable current membership falls back to an allowed one, and suspended/no-access states stop mounting pages.
- Corrected one missing comma in the pre-existing roleCopy localization edits so TypeScript could run. Remaining localization changes are outside this task.

Executed evidence:
- 7 Playwright contract journeys passed on installed Chrome against local Next dev port 3037: review-before-send, permission saving/audit display, effective-permission denial despite owner label, owner start/cancel, mobile recipient acceptance, switch clears drafts/member data, revoked-membership revalidation clears previous data.
- These browser tests intercept API responses. They prove UI contract behavior, not real authentication, email delivery or websocket termination. See e2e/team-access.spec.ts.
- Desktop and 390px mobile screenshots were rendered and visually reviewed: [desktop](workspace-access-desktop.png), [mobile](workspace-access-mobile.png). Permission/action/status codes are displayed as readable Dutch labels.
- TypeScript and targeted ESLint passed. Backend focused run: 53 tests passed, 8092 assertions, covering access history, team, ownership transfer, realtime revocation logic, mail tests and OpenAPI coverage. Pint and targeted PHPStan passed.
- Real HTTP server plus isolated SQLite fixture captured history 200/401/422, recorded in ../shopbonus_backend/docs/api/WORKSPACE_ACCESS_HTTP_CAPTURE.json. Authorization/isolation tests also cover 403/404 and pagination.
- npm production audit: zero vulnerabilities. Full npm audit: 22 moderate development-tool findings (minimatch/esbuild and dependent tools), all reported without an automatic fix. Reports: workspace-access-npm-audit.json and workspace-access-npm-audit-all.json. No dependency overrides or broad upgrades were applied.
- Composer audit initially found symfony/mime v8.1.7 vulnerable to CVE-2026-45070. Existing lockfile already selected v8.1.10; targeted composer update aligned installed vendor packages to it. Post-update audit returned no advisories or abandoned packages; no lockfile change was needed. Backend report: docs/workspace-access-composer-audit.json.

Release evidence still required:
1. Two real authenticated browser sessions against Reverb: subscribe as a member, publish an order, revoke orders.view/remove/suspend from a separate owner session, record termination of the existing socket and absence of subsequent events; reconnect and record channel authorization refusal. Current backend tests mock broadcaster behavior.
2. Broadcaster failure/recovery: stop Reverb, revoke access, restore Reverb and prove no revoked channel delivery. RealtimeAccess currently reports termination failures without durable retry; operational recovery is not established by the passing outage unit test. Decide/implement a durable retry if operational evidence shows an open socket can survive.
3. Every merchant route with two approved real workspaces: populate distinctive data and drafts, switch both ways, navigate back/forward, race slow old responses, revoke the current membership, suspend a workspace, and check network/storage/live subscriptions. The controlled team tests and shared remount boundary do not establish every-screen isolation.
4. Genuine Google Places search/details and manual fallback using an authorized provider configuration; capture provider request/status and visible result with secrets removed.
5. Send a real invitation through staging mail transport and verify recipient delivery, review, same-account acceptance, replay/expiry/cancel and resend cooldown. Array/fake mail tests do not establish delivery.
6. Repeat complete onboarding/team/transfer journeys at desktop/tablet/mobile sizes with real APIs. Local desktop/mobile screenshots only cover the focused team UI.
7. Resolve the remaining development dependency advisories when compatible patched upstream versions are available and rerun full npm audit.
8. Staging performance: authorized staging URL, representative tenant/data and workload are needed. Record endpoint mix, concurrency, duration, failures, server config and warm/cold conditions; calculate P95 from server response samples and establish less than 300 ms. Local development timings are not staging evidence.

No deployment or live provider change was made. Exact next action: supply/use the authorized staging environment and test identities for the release matrix above; retain PARTIAL until results are recorded.
