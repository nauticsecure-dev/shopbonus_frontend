# Merchant overview review — 2026-10-31

Implementation checkpoint, PARTIAL acceptance. Backend branch HassanDev, base 59916e9; frontend HassanDev, base 3d0b0ad. Changes remain uncommitted; unrelated existing changes were preserved. No production migration or deployment performed.

Implemented overview pagination (10/page), lifecycle filters before pagination, four primary KPI cards, secondary operational details, unavailable/error states, request cancellation, 30-second visible-tab polling, focus refresh and generated_at freshness text. KPI/chart/claim notices open existing voucher records using claimed=1 and business-timezone claim-day filters, including subsequent redemption; list adds claimed_at. No new route or duplicate claim store.

Recovered stock alerts resolve on generator runs and dashboard/workspace-notification reads; resolved legacy records remain stored but are excluded from dashboard, workspace list and central inbox. Count-change signals refresh central badges; pending outbox/mail delivery skips resolved entries. Invalid import batches and explicit provider mismatch/sync_error results now produce deduplicated offer alerts. Normal unverified/manual-required codes are not treated as verification failures.

Effective lifecycle is shared by SQL filters/KPIs and displayed rows: archived, expired, scheduled, draft, paused, sold_out and active, including allocation limits. Active excludes sold-out/future/expired offers. Existing platform access policy retained: nonmember 404 (existence concealed), member lacking permission 403. API contract and real HTTP captures are in docs/api/MERCHANT_OVERVIEW_CAPTURE.json and docs/api/README.md.

Executed: focused Analytics/Notifications/OpenApiCoverage run 70 tests, 67 passed, 3 skipped, 5587 assertions (SQLite); targeted Pint and PHPStan pass (0 errors); frontend typecheck and targeted ESLint pass; ten Playwright Chrome browser contract journeys pass. Browser responses are controlled fixtures, not ten real-service E2E journeys. Desktop/mobile screenshots were visually inspected. Backend historical E2E naming now explicitly describes API integration evidence; sequential claims no longer described as concurrency.

Volume evidence: 10,000 available codes + 10,000 accepted claims/issued vouchers, 30 days, three SQL aggregate queries, 463.7 ms on local SQLite. See docs/analytics/MERCHANT_OVERVIEW_BENCHMARK.json. Daily SQL grouping uses UTC boundaries of each local day (DST tested), returning at most one row/day/source. Added workspace/timestamp indexes. This is not a production P95 or MySQL/Redis load result.

Migrations: 2026_10_31_160000_add_resolution_to_merchant_notifications and 2026_10_31_160100_index_merchant_lifecycle_analytics. Applied only to isolated test/capture SQLite databases. Apply both before running this code against an existing database. The synthetic HTTP capture server and temporary credentials/database were removed afterward.

Exact next acceptance work: supply the original screenshot for a reference comparison; exercise all ten journeys with real sessions/services and a real concurrent claim workload; benchmark representative MySQL/Redis deployment and inspect plans. Full repository test/build suite and production provider verification NOT RUN. Checklist items stay unchecked until a commit records evidence/SHA, per AGENTS.md rule 12.


## Review findings

| Finding | Result |
| --- | --- |
| Overview pagination | Server page/per_page connected; accessible previous/next; filter resets page; workspace remount resets state. |
| Claim navigation | KPI, chart points and claim notifications open actual accepted voucher records; claim-date filter uses Europe/Amsterdam including DST. |
| Replenishment alerts | Resolved on next overview/list request; retained for history; excluded from central inbox/unread counts. |
| Failure zeros | Missing KPI data reads Niet beschikbaar; failed notifications cannot show an empty inbox. Dashboard/chart retry independently. |
| Freshness | Visible-tab polling every 30 seconds, focus/visibility refresh, generated_at display, >90s warning and failed-request errors. |
| Lifecycle disagreement | SQL effective lifecycle matches row status, dates, allocation limits and stock; filters precede pagination. |
| Four cards | Exactly four primary cards; additional operational metrics and activity preserved below in details. |
| Claim aggregation | Three bounded daily SQL aggregate queries plus scoped timestamp indexes. |
| Notifications | Existing coverage retained; invalid imports and provider verification failures added; central projection resolution verified. |
| E2E claims | Ten browser contract regressions with fixtures, backend integration scenarios and real HTTP API captures; full real-service acceptance remains partial. |

## Reproduce

Backend: php artisan test --compact --filter='MerchantDashboardTest|MerchantOverviewE2ETest|Notifications|OpenApiCoverageTest'

Frontend: npm run typecheck; npx eslint src/app/dashboard/page.tsx src/app/dashboard/vouchers/page.tsx src/lib/merchantDashboard.ts src/lib/merchantVouchers.ts e2e/merchant-overview.spec.ts

With the development server running, set PLAYWRIGHT_CHROMIUM_EXECUTABLE to the installed Chrome executable when bundled Playwright Chromium is absent; run npx playwright test e2e/merchant-overview.spec.ts --workers=1. Desktop/mobile captures are produced in test-results. API mocks explicitly do not prove live backend persistence or authorization.

Captured fixture layouts: [desktop](merchant-overview/desktop.png) and [mobile](merchant-overview/mobile.png). These are implementation evidence, not an approved reference-image comparison.
