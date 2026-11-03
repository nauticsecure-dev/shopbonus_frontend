# Homepage publication review — 2026-11-03

Revision-bound publication and queued homepage replacement are implemented and verified locally. Release acceptance remains partial for exact visual parity and representative deployed performance. Changes are uncommitted on `HassanDev`: backend base `b92f46ab2b471fc4796310e059568bdddde276a4`, frontend base `bd76ff420cda1aa180e45e44a521ff0707670b3f`. Existing unrelated edits are preserved. No new migration, commit, push or deployment; the main application database was not migrated.

## Implementation

- Homepage publication requires the reviewed `revision`. The controller passes it to the existing transactional `CmsService::publish()` comparison. Missing/invalid revision returns 422; a concurrent draft save returns 409 `draft_changed`, preserving public content and history.
- The editor publishes or queues the exact revision returned by its own save. It does not fetch a newer, unreviewed revision. Editing and publication remain disabled until the stored draft finishes loading, including editor reentry; the public snapshot remains visible meanwhile.
- Inline scheduling uses the existing generic CMS publication scheduler, with separate local-time input, revision pinning, status and cancellation. Current approved content stays live until execution. Later draft saves invalidate the scheduled revision. Deployment must run the existing every-minute `shopbonus:publish-scheduled-content` command. The old homepage `/schedule` API remains a legacy visibility-window draft operation for compatibility.

## Executed verification

CMS backend suite: **31 passed, 315 assertions**; distinct-second-Super-Admin conflict regression also passed independently. [JUnit](../../shopbonus_backend/docs/cms/homepage-publication-review.junit.xml). Tests cover unchanged public content/history after stale publication, successful reviewed publication, scheduled replacement and stale scheduled drafts.

Six selected real-service journeys have passing results across separate runs. The complete 14-case suite was not rerun as one green run. [Combined verification and original attempt counts](homepage-review-verification-summary.json):

| Journey | Result and evidence |
| --- | --- |
| Wallet | Real backend 500, unavailable state after reload, recovery to newly credited ledger balance: PASS; [first-run results](homepage-live-first-review-results.json). |
| Draft loading and concurrency | Hold then forward the real draft GET; publication disabled and no editable heading until response. Concurrent saved draft between browser save and publish returns 409, preserving live content/history: PASS; [CMS results](homepage-live-cms-review-results.json). |
| Scheduling | Queue the saved revision, preserve the current public page, display status and cancel through the inline UI: PASS; [CMS results](homepage-live-cms-review-results.json). |
| Publication contract | Real cookie-authenticated missing/stale/current revision requests return 422/409/200: PASS; [captured responses](../../shopbonus_backend/docs/api/HOMEPAGE_PUBLICATION_REVIEW_HTTP_CAPTURE.json), also copied into OpenAPI. |
| Media | Crop/upload mobile, desktop and SEO images; validate actual image responses; publish navigation/footer, drag ordering and featured selection; verify selected mobile source and capture both viewports: PASS; [final media results](homepage-live-results.json). |
| Restoration | Publish A then B, inspect selected A, dismiss then accept confirmation, verify a new persisted revision restoring A, preserve EN and enforce guest/consumer history denials: PASS; [restore results](homepage-live-restore-review-results.json). |

These use real Laravel HTTP and Next.js, isolated SQLite, installed Chrome and synthetic actors. Login, CSRF, TOTP MFA and recent-password confirmation run through actual services. No API response fixtures are used; route interception only pauses and forwards real requests. Wallet reconciliation passed after every recorded run. HTTP evidence: [wallet/contract](homepage-live-first-review-http.json), [CMS](homepage-live-cms-review-http.json), [restoration](homepage-live-restore-review-http.json), [media](homepage-live-http.json).

TypeScript, targeted production-source ESLint, Pint, PHP/Node helper syntax and scoped whitespace checks passed. OpenAPI syntax validation passed. Full OpenAPI route coverage still fails on an unrelated missing `POST /api/v1/workspaces/{workspace}/connections/{connection}/pause` entry in the shared working tree; [coverage JUnit](../../shopbonus_backend/docs/cms/homepage-openapi-review.junit.xml). No whole-tree CI pass is claimed.

Earlier attempts are retained: memory/readiness failures, development reloads during implementation, an empty-preflight recording error, an assertion reading a response body after navigation, and an immediate mobile-image assertion before source selection. The recorder and timing assertions were corrected. Featured preview hit its existing 8-second fetch timeout under queued local requests; the passing media run explicitly settles requests and retries selection through the UI. That timeout behavior was not changed or accepted as representative deployment performance.

## Supplied live reference

Reference: <https://www.shopbonus.nl/>. Captures use Dutch locale, wait for fonts and the hydrated guest wallet, and were visually inspected: [1440 × 900 desktop](homepage-reference-desktop.png), [390 × 844 mobile](homepage-reference-mobile.png). Reproduce with `node scripts/homepage-deployed-reference.cjs` using network access. [Raw measurements](homepage-deployed-reference.json).

The reference and existing local screenshots share the navy/blue type, gradient hero, balance/voucher artwork, rounded cards and stacked mobile layout. Exact parity is **not accepted**: the older local screenshots contain a synthetic heading, authenticated wallet, editor/dev overlays and different navigation/footer copy; section/search spacing also differs. An equal-content, equal-locale guest baseline is needed for a valid pixel comparison. Media-test screenshots use synthetic crop images and are not a design baseline.

| Deployed sample | TTFB | Load | Observed LCP | Observed CLS |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 188 ms | 1510 ms | 2508 ms | 0 |
| Mobile viewport | 172 ms | 1647 ms | 1332 ms | 0 |

Thirty sequential public HTML requests returned 200; measured end-to-end P95 was **646 ms**. These are local Chrome measurements without CPU/network emulation, against the existing deployment. Mobile means viewport size only. They are not field Core Web Vitals, representative load testing, isolated server/API timing, or measurements of this unshipped patch.

## Cleanup and next action

[Cleanup evidence](homepage-review-cleanup.json): test ports closed, nine task-created fixture databases removed, six visually identified/hash-verified synthetic crop files removed, and the preexisting fixture database restored unchanged. No unrelated media files were removed. A PHP environment-propagation probe passed after the helper was adjusted to populate `LARAVEL_STORAGE_PATH` for future server launches; the complete browser journeys were not rerun after that harness-only flag change.

The helper deliberately refuses a preexisting fixture database; inspect and preserve that file before a fresh run. Review the uncommitted patch and evidence, resolve unrelated route documentation coverage, establish an approved equal-state visual baseline, verify genuine provider/production authenticated behavior and measure representative deployed server/API performance. Ensure the deployed CMS scheduler runs. Checklist boxes remain unticked pending an implementation commit SHA, per repository instructions.
