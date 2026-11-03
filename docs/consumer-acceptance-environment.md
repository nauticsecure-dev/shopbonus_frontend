# Local consumer acceptance environment — 2026-11-03

This setup runs real Laravel HTTP, database-backed sessions/queues and local SMTP
capture. It is a local test environment, not representative staging infrastructure.
It does not certify the ten complete release journeys or external providers.

## Services and data

| Service | Address |
| --- | --- |
| Consumer UI | http://localhost:3038 |
| Laravel API | http://localhost:8038 |
| Mailpit inbox | http://localhost:8039 |
| SMTP capture | 127.0.0.1:1038 |

Use `localhost` consistently for browser/API cookies. All listeners bind to the
loopback interface. The generated application key lives in the Git-ignored
`.env.consumer-acceptance.local`; SQLite, SMTP messages and runtime files live in
the Git-ignored `.consumer-acceptance/` directory. Next uses its own
`.next-consumer-acceptance` build directory. Developer `.env.local` and the main
backend database are not changed. The launcher supplies backend example defaults
and explicit local overrides, including an isolated configuration-cache path.
External dispatch/synchronization and AI are disabled; no provider credentials
are required. Admin MFA remains enforced.

## Setup and restart

Run in `C:\wamp64\www\shopbonus\shopbonus_frontend`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-consumer-mailpit.ps1
npm run acceptance:setup
npm run acceptance:start
```

Prerequisites: installed frontend/backend dependencies, Node, PHP with SQLite,
and enough Windows memory for another Next.js process. The installer downloads
the official [Mailpit v1.33.0 Windows AMD64 release](https://github.com/axllent/mailpit/releases/tag/v1.33.0)
and checks its published SHA256 before extraction. It is a portable workspace
binary, not a system service. `CONSUMER_ACCEPTANCE_PHP` can select a different
PHP executable. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects the smoke-test browser;
the default is installed Chrome.

Keep the startup terminal open; Ctrl+C stops its services. There is no destructive
reset command. Setup applies existing migrations to the dedicated SQLite file,
seeds the existing local demo catalog once and idempotently creates points
fixtures. Rerunning setup does not replenish spent points or restore used codes.
If setup fails, fix the reported issue and rerun it; incomplete demo seeding
has no completion marker and is retried using the existing idempotent seeder.

For limited memory, run these in separate terminals:

```powershell
npm run acceptance:start -- --api-only
# Start the UI later, once enough memory is available:
npm run acceptance:ui
```

The API-only mode runs Laravel, Mailpit and the queue worker without Next.
Scheduled reminder execution is not started automatically. External Answer24,
affiliate, Mollie and ecommerce test services are not configured or simulated.

## Test accounts and fixtures

Local demo login: `consumer@shopbonus.local`, password `ShopBonus-Local-2026!`.
Second consumer for ownership checks: `anna@shopbonus.local`, same local password.
These are the repository's demo credentials, for this loopback-only setup.
Register a fresh consumer through the UI to exercise actual verification mail;
the inbox displays messages instead of sending them to an external address.

The primary consumer starts with 1,000 available points and 80 pending points,
plus independent EUR credit. A published 250-point voucher has twenty unique
local codes. The exact offer slug is in `.consumer-acceptance/fixtures.json`;
open `/aanbiedingen/{points_offer_slug}`. Quote is non-mutating; confirming
a purchase consumes points and one code. There is no EUR-to-points conversion.

## Verification commands and evidence

```powershell
npm run acceptance:check
npm run acceptance:smoke
# Without Next/Chrome:
npm run acceptance:check -- --api-only
npm run acceptance:api-smoke
```

The browser smoke uses actual registration, queued SMTP verification, offer
details, checkout and the refreshed dashboard. The API smoke uses actual
registration/mail verification, quote/purchase/replay and points-filtered history.
Each successful purchase uses 250 points; fixtures allow four from the starting
points balance. Neither script intercepts responses. Summary files are
`docs/consumer-acceptance-{api-,}smoke.json`; they omit passwords, cookies and
verification codes. Mailbox/runtime data are private local artifacts.

During setup on 2026-11-03, the dedicated migration/seed and final readiness checks
for API, UI and mailbox passed. An initial Next startup failed under Windows
memory pressure; a later separate UI startup succeeded. The four real API/SMTP
smoke checks passed, including purchase replay and unchanged EUR/pending balances.
PHP syntax/Pint passed; direct fixture invocation without the isolated launcher
was rejected with exit 1 as expected. The real browser smoke also passed four
checks: registration, queued SMTP delivery, email verification/dashboard entry,
and points offer/checkout/dashboard refresh. An earlier browser attempt completed
its purchase but its final selector was ambiguous when available and spent points
were equal; the selector now permits this legitimate state. These smoke checks
consumed 750 of the primary fixture's 1,000 points in total, leaving 250 available
and 80 pending. Evidence: `docs/consumer-acceptance-api-smoke.json` and
`docs/consumer-acceptance-smoke.json`. This does not close the ten release journeys.

Before release, still configure actual provider sandboxes and eligible activation
events/tokens, external mailbox delivery, representative staging infrastructure,
approved desktop/mobile references and full accessibility/cache-invalidation
checks. Local timing and SMTP capture do not satisfy those release gates.
