# My benefits review — 2026-11-03

Status: implemented locally; live acceptance remains PARTIAL. Frontend branch `HassanDev`, base `bd76ff420cda1aa180e45e44a521ff0707670b3f`. Changes are uncommitted alongside existing unrelated work. No deployment, migration, provider activation or financial policy change.

## Policy finding

The cited settlement-default finding predates the current code. `../shopbonus_backend/config/shopbonus.php` now sets `affiliate.credit_timing` to `on_validated_attribution`. The backend decision “Revised affiliate timing and platform acceptance — owner, 2026-11-02” explicitly supersedes earlier settlement gates for new evaluations, preserves frozen historical timing, and says subsequent rejection does not automatically claw back instant consumer credit. This review does not switch that policy.

The existing pending-balance repair is preserved: only authoritative available credit is spendable; actual pending cashback and checkout reservations remain separate. Wallet and purchase explanations now use the locale dictionary and refer to each reward's applicable terms instead of promising universal immediate credit or hiding pending rewards.

## Changes

- Recent activity distinguishes loading, successful empty results and failures. Retry starts a new request. Refresh failures retain prior data with an explicit stale notice; failed or loading responses never show the genuine-empty message.
- Dashboard responses are scoped to user and locale, with request keys covering financial revisions and retries. Effect cleanup ignores obsolete responses. A locale/account change does not reuse another scope's dashboard.
- NL/EN static copy covers wallet explanations, activity, offers, navigation, voucher filters/details, disputes, transaction controls, errors and loading states through `LocaleContext` and the shared dictionary. New benefits keys use an explicit English fallback for German pending a German copy review. Provider/CMS text and API-provided titles/reasons/statuses remain server content.
- Page amounts, percentage decimals and dates use `intlLocale`. `formatNlDate` retains its Dutch default for existing callers and accepts an optional locale.

## Verification

- Final `npm run typecheck`: PASS.
- Final Chrome Playwright run: 7 PASS, mocked HTTP against the running Next.js UI (`e2e/benefits-activity.spec.ts` and `e2e/benefits-pending-balance.spec.ts`). Both languages cover delayed loading, 503 failures, retry, dated history, available/pending amounts, focus-triggered authoritative refresh, retained stale activity and successful empty history. Mobile checks cover voucher details, transaction labels/history and absence of horizontal page overflow at 390px. Existing historical pending/reserved balance regression also passes. Initial fixture route patterns were corrected before this final passing run.
- ESLint for new copy, shared dictionaries, money helper and new browser tests: PASS. Scoped `git diff --check`: PASS.
- Targeted page ESLint: five pre-existing `react-hooks/set-state-in-effect` errors and one pre-existing unused image-rule suppression warning. These are the same effects documented in `docs/order-adapter-review.md`; no new effect lint failure was added.

## Remaining acceptance evidence

Provider-backed verification is NOT RUN for TradeTracker, Daisycon and direct merchant flows. Required evidence includes the applicable versioned earning rule and immutable timing snapshot, trusted attribution/payment evidence, remittance evidence where the historical policy requires settlement, idempotent reconciliation, and subsequent rejection/refund/reversal handling. Local fixtures cannot establish these facts.

Live private Reverb disconnect/reconnect recovery, actual clipboard grant/denial behavior, provider-triggered synchronized wallet/history updates, complete voucher-context support escalation and responsive comparison with an approved visual reference remain NOT RUN. The browser focus test exercises the HTTP refresh/revision path with mocks; it does not prove a real Reverb reconnect. Mobile layout checks do not establish reference matching.

Next action: execute authenticated staging journeys with both affiliate networks and a direct merchant integration; capture the rule/snapshot, source references, resulting ledger entries and browser behavior for each outcome. Keep release acceptance PARTIAL until that evidence is available.
