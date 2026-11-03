# Notification review follow-up — 2026-11-03

Implementation is local and uncommitted. Existing unrelated edits are preserved.

- Shared identity link defaults now target existing consumer, dashboard and admin pages. Consumer wallet/voucher links select the corresponding benefits tab; workspace links retain the public workspace query. The central notification mail renderer already mapped the three legacy action paths; those mappings remain for existing records. No production environment override or config cache was changed or verified.
- Notification subscribers share one channel and one listener set per user. Cleanup is idempotent and leaves only after the final consumer disposes. Every successful private subscription acknowledgement, including after reconnect, schedules authoritative HTTP catch-up for each mounted hook. Recovery refreshes list/count without synthesizing new toast events.
- Templates and delivery logs now have independent previous/next pagination, totals and disabled boundaries. Loading prevents repeated pagination while a request is pending; a sequence guard drops stale successful responses. Existing overview template counters describe the loaded page, as before.
- Failed/uncertain deliveries require an administrator review note (10–500 characters). Uncertain retry also requires an explicit, initially unchecked duplicate-email acknowledgement; the backend still enforces the acknowledgement and retry limit.
- Uncertain deliveries expose confirmed-sent and do-not-resend resolution using the existing API and existing password/OTP step-up flow. Resolution requires a review note and does not require retry consent. Notes and acknowledgement reset when a delivery's status/attempt count changes. New controls include NL/EN/DE copy.

No API contract or migration changes. No live email, AI provider call, deployment or commit.

Validation results are recorded in the backend notification review checkpoint after all checks finish. Browser tests use intercepted API fixtures and real Chrome; reconnect lifecycle tests use an Echo/Pusher test double. A live Reverb transport-drop/provider test and deployed environment verification remain unrun.

Executed checks:

- Backend notification suite plus IdentityMailTest: 57 tests, 54 passed, 3 database-concurrency skipped, 349 assertions. Targeted Pint passed.
- Frontend TypeScript and targeted ESLint passed.
- Node Echo lifecycle regressions: 3 passed.
- Chrome browser regressions: 7 passed across notification-management-review.spec.ts and notification-templates.spec.ts. Final management-only rerun: 4 passed with stronger success/terminal-state assertions.
- Targeted git diff whitespace checks passed. Full suites and live-provider/Reverb acceptance were not run.
