# Platform launch acceptance follow-up — 2026-11-02

Local acceptance repairs verified; production release remains NO-GO.

Backend branch HassanDev, base 926ab34068e18cca081b7b168cc2ed6f7622fe29.
Frontend branch HassanDev, base 5abab5083ce7036177d7cbef27688f449d6b0f35.
Changes are uncommitted; existing CMS edits were preserved. No deployment,
provider activation, persistent database migration, commit or push performed.

## Review findings

1. Current backend already freezes new affiliate rewards to
   `on_network_settlement`, ignoring instant-credit configuration. Pending
   rewards remain unavailable; approval also requires independently recorded
   settlement. Historical timing snapshots remain supported. The business
   journey now checks zero available before and after approval, records
   explicitly synthetic settlement, then checks exactly-once credit and checkout.
2. The cover route already exists in OpenAPI with public access, a binary
   success schema and an error example. The existing README and
   `docs/api/AFFILIATE_DETAIL_HTTP_CAPTURE.json` contain a captured cover request.
   API coverage passes; no duplicate documentation was added.
3. Merchant analytics already uses authenticated, workspace-scoped overview
   and attribution APIs, real date/currency selectors and detail navigation.
   This follow-up keys responses by workspace/revision/period/retry and drill-down
   page, so stale data cannot populate a different selection. This also resolves
   two React effect lint errors without suppressing the rule.
4. GET `/api/transactions` and `/api/vouchers` now return HTTP 410,
   `error.code=endpoint_retired` and `Cache-Control: no-store`. Their responses
   contain no fabricated balances, transactions or vouchers. No source callers
   were found. Consumers use the existing authenticated backend wallet and
   voucher APIs.

## Executed evidence

- PHP 8.5 / SQLite: 109 tests passed, 8,767 assertions. Scope: BusinessJourney,
  AffiliateTest, OpenApiCoverage, Analytics, WalletService, WalletApi,
  CheckoutTest and PointsCheckoutTest. No external provider proof is implied.
- Targeted Pint and backend/frontend diff whitespace checks passed.
- Frontend TypeScript and targeted ESLint passed.
- Chrome: all four launch-acceptance test cases passed on rerun. Analytics tests
  intercept backend APIs and verify scoped requests, periods, currencies,
  attribution drill-down, real links and error/retry behavior. Retirement tests
  call the running Next server directly and verify actual HTTP 410 responses.
  The initial browser run had one cold-compilation navigation timeout; the other
  three passed. Final aggregate: four passed in 1.0 minute, exit code 0.
- Production build (`npm run build -- --webpack`, isolated
  `.next-launch-build` directory): passed, exit code 0, all 65 pages generated.
  The existing metadataBase warning defaults social image URLs to localhost;
  deployment origin/SEO configuration still needs review. Temporary dev server
  stopped; Next-generated test/build includes removed from tracked tsconfig.
- Read-only local launch check: 9 PASS, 12 FAIL, 4 WARN, 2 MANUAL; sanitized
  output is `../shopbonus_backend/docs/release/LAUNCH_CHECK_2026-11-02.json`.

## Reproduce

Start an isolated development server with
`SHOPBONUS_NEXT_DIST_DIR=.next-launch-acceptance` and
`node node_modules/next/dist/bin/next dev --webpack --port 3331`.
Run `npx playwright test --config playwright.launch-acceptance.config.ts`.
Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome executable if the
Playwright browser is unavailable. Stop the server afterwards.

## Remaining release work

The local environment is not production: HTTPS/cookies/origins/admin MFA,
real mail, Mollie credentials, signed Answer24, backups and applied migrations
fail the existing configuration check. Proxy, live payment/dispatch and restore
configuration also need review. These local results do not describe an unseen
production environment. No production deployment target or access was supplied.

Run Linux CI/full suites, MySQL and the documented staging/provider journeys
against a clean reviewed release SHA. Supply real provider/store/payment,
worker/scheduler/Reverb, backup restore and legal acceptance evidence as required
by the existing backend release runbook and `../qa-evidence/GO_NO_GO.md`.
Full production acceptance is not established by the focused local tests.
