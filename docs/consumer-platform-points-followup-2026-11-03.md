# Consumer platform points follow-up — 2026-11-03

## Revalidation and environment setup

The five frontend fixes were already present in the working tree. Follow-up
localized the remaining raw points, purchase/reward and transaction-detail
statuses, preserving the distinction between approval, settlement and posting.
Revalidated all four focused browser suites: **20 passed (2.5 minutes)**.
TypeScript, scoped new-code ESLint and scoped diff checks passed. The dashboard
retains its five previously recorded hook lint errors and one warning.

At the user's request, added a dedicated real-service local acceptance setup:
[setup, accounts, commands and limits](consumer-acceptance-environment.md).
API/SMTP evidence is separate from fixture browser checks and release acceptance.
Final local setup: dedicated API, UI and Mailpit readiness passed. Four real
API/SMTP checks and four real browser smoke checks passed without interception.
The API check includes idempotent purchase replay; the browser check includes
registration, queued SMTP verification and the refreshed points dashboard.
These remain partial release evidence. Three successful 250-point purchases
(including an initial browser selector failure after purchase) leave 250 of
the seeded available points. The pending 80 points remain unchanged.

Status: local implementation; release acceptance remains PARTIAL. Frontend
branch `HassanDev`, base `bd76ff4`, with pre-existing uncommitted changes preserved.
No commit, deployment, migration or reward-policy change was performed.

Owner-selected local real-service follow-up:
[executed scenarios, raw latency and acceptance limits](consumer-platform-local-acceptance.md).
Real registration, activation/token protection, points purchase/activity and
profile email change were exercised. Final local P95: directory cold 257.74 ms,
repeated 106.28 ms; dashboard 146.01 ms (100 samples each, isolated OPcache-enabled
HTTP server). These results do not establish staging or full operational approval.

## Implementation

- Preserved the existing points-only checkout and dual-price wallet selection.
  Quote and purchase requests explicitly send `wallet_unit`; points are integers
  with no EUR conversion. Expanded checkout regressions to NL and EN.
- The dashboard reads `balances.points` from the existing central `/me/wallet`
  summary through `ShopBonusContext`. Available, pending, reserved, earned and
  spent points are distinct. All five values require nonnegative safe integers
  and the correct unit. Missing data is unavailable rather than an invented zero.
  The existing account/locale ownership and financial refresh handling applies.
- Added a points overview above the EUR-credit summary and explicit
  `unit=points` activity requests to the existing wallet transaction endpoint.
  Activity hides obsolete revisions during refresh, ignores superseded requests,
  rejects amounts with the wrong unit, and provides recoverable errors.
- Fixed points formatting in the general transaction list and detail view.
  The current dashboard `recent_activity` response omits wallet units even though
  its query includes multiple wallets. These untyped amounts now display `—`;
  no unit is inferred. The points overview and transaction history provide
  authoritative amounts. A future backend change can supply an explicit unit
  before this projection displays amounts again.
- Offer details show independent points and EUR costs when supplied. Points-only
  offers have a redeem-points action leading to checkout. Static offer and checkout
  copy, blockers, confirmation, payment explanations, dates and amounts follow
  the selected NL/EN locale. Merchant/API content retains its service contract.
  Header credit amounts now also use the selected number locale; wallet fallback
  errors use the existing benefits dictionary.
- Preserved the existing pending-cashback explanation and separate checkout holds.
  No frontend change chooses a different earning/approval/settlement policy.
- Fixed the dashboard's indefinite loading state after a wallet failure so the
  unavailable state and retry action can render.

## Verification scope

Browser checks use controlled HTTP responses with the actual local Next.js UI
and installed Chrome. They establish frontend behavior, not provider or staging
acceptance. The fixtures now supply the CSRF cookie required by the current API
client. Activity assertions are scoped to their section; the recovery test
accepts explicit retry or automatic focus recovery, then independently verifies
the successful result and later stale-data behavior.

- Final browser run: **20 passed (1.2 minutes)**. Suites:
  `e2e/points-checkout.spec.ts`, `e2e/consumer-points-overview.spec.ts`,
  `e2e/benefits-pending-balance.spec.ts`, `e2e/benefits-activity.spec.ts`.
  Used `BASE_URL=http://127.0.0.1:3000`, installed Chrome via
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `--workers=1 --reporter=list`.
- `npm run typecheck`: PASS after final changes.
- Scoped ESLint for checkout, offer detail, points component, Header, wallet
  context, shared types/copy and four browser suites: PASS with one pre-existing
  unused image-rule suppression warning in Header. The dashboard page retains
  its five pre-existing `react-hooks/set-state-in-effect` errors and one unused
  image-rule suppression warning; full-project lint is not claimed clean.
- Scoped `git diff --check`: PASS.
- NL/EN desktop (1440 × 1000) and mobile (390 × 844) full-page captures:
  `docs/consumer-points-{nl,en}-{desktop,mobile}.png`. Visually inspected the
  English desktop and Dutch mobile captures; points/pending/holds are readable
  and separate from EUR credit. Both language browser cases verify mobile page
  overflow. These are current-UI inspection artifacts, not approved baselines.
- Earlier runs exposed fixture CSRF omissions, duplicate text/retry selectors
  after adding a second activity section, and the focus-recovery test race.
  Corrected the test harness and assertions before the final passing run.

## Release evidence still required

| Requirement | Current status / required evidence |
| --- | --- |
| Ten Trello #18 real-service journeys | Focused local checks in areas 1–9 passed across the recorded full and targeted runs; operational area 10 remains PARTIAL. The linked local acceptance record lists exact coverage and synthetic/captured-mail limitations. Full release subcriteria and external delivery are not approved. |
| Directory and dashboard P95 below 300 ms | NOT RUN on representative staging infrastructure. Historical local directory cold P95 is 431.16 ms and warm P95 62.97 ms; neither establishes the staging target. Record both endpoints, infrastructure, dataset, concurrency, cold/warm state, sample counts and raw latency results. |
| Deployed cache invalidation | NOT RUN. Verify authenticated purchase/activation and catalog changes against deployed caches, directory, dashboard and reconnect recovery. |
| Complete accessibility | NOT RUN. Mobile overflow and semantic-control regressions do not replace a full keyboard, screen-reader, contrast and error-recovery review. |
| Dependency remediation | Fresh Composer audit is clean. Fresh npm audit is blocked pending separate approval to send dependency metadata to the registry. No dependency changes, current npm clearance or remediation are claimed. |
| Approved-reference comparison | NOT RUN. Captures of the new UI are inspection artifacts, not approved references. Requires approved desktop/mobile source images, viewport/account/locale metadata and comparison evidence. |

Related records: [discovery](discovery-review-followup.md),
[profile acceptance](consumer-profile-acceptance.md),
[benefits](benefits-review.md), [checkout](points-checkout-review.md).
