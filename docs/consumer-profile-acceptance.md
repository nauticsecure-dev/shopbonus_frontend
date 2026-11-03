# Consumer profile verification — 2026-10-31

Status: PARTIAL acceptance. The ten real-service journeys in Trello #10 remain
the release target. Browser regressions with controlled API responses do not
prove email transport, reminder dispatch, database persistence, real wallet
purchases, ownership enforcement, or screenshot matching.

Consumer platform points follow-up (2026-11-03):
[implementation and remaining release evidence](consumer-platform-points-followup-2026-11-03.md).
The new central-wallet points overview and frontend regressions do not close
the ten real-service profile journeys or the separate Trello #18 platform journeys.

Subsequent owner-selected local service checks are recorded in
[consumer-platform-local-acceptance.md](consumer-platform-local-acceptance.md).
They add actual UI name persistence, API language/preferences, new-email queued
code confirmation/reuse denial/login, and an actual points purchase with ledger
and ownership checks. This is additional partial evidence; avatar, password/MFA,
reminder transport, all failure combinations and approved-reference acceptance
are not established by those focused platform checks.

## Follow-up — 2026-11-03

Tested working trees: frontend base `bd76ff4`, backend base `b92f46a`, with
pre-existing uncommitted changes. No commit or deployment performed.

- Desktop wallet label, available-balance tooltip, loading/error/stale text and
  mobile wallet label use the existing locale dictionaries (NL/EN, with German
  entries to retain dictionary parity).
- Added two controlled browser cases for NL/EN through desktop/mobile loading,
  failure and recovery. Both passed. The initial full run passed 11/12 cases;
  its stale-balance assertion expected an amount that the current context hides.
  Corrected that assertion to check an unavailable amount and reran it: passed.
  No wallet state behavior was changed for this assertion update.
- TypeScript and targeted ESLint passed; Header retains one existing unused
  image-rule suppression warning. Scoped diff whitespace checks passed.
- Updated the shared browser fixture to provide the CSRF cookie now required
  before initial reads. These remain controlled-response tests.
- Environment inspection: `.env.local` selects `http://localhost:3000` and
  `http://localhost:8010`. Backend `.env` uses `MAIL_MAILER=log`, database queues
  and `NOTIFICATION_EMAIL_ENABLED=false`; it cannot demonstrate real mailbox
  delivery. No acceptance account or approved visual reference setting was found.
- A reproducible local demo smoke check is available as
  `node scripts/consumer-profile-live-review.cjs`. It loads `.env.local`, requires
  local hosts, uses the existing seeded consumer, and restores the original name
  after checking save/reload persistence. Results are recorded in
  `docs/consumer-profile-live-results.json`; this is separate from full release
  acceptance and does not enable mail delivery or create visual approvals.
- The local smoke check passed real CSRF/login, authenticated profile/header
  loading, browser name save/reload plus independent API persistence, invalid-name
  rejection and restoration of the original demo name. No API responses were
  intercepted. The API was initially offline; started the local PHP server on
  port 8010. Final run used Xdebug disabled. Earlier failed attempts exposed a
  short harness timeout and rotated-CSRF handling; both were corrected before
  the successful run. No migrations or mail settings were changed.

## Executed checks

- Browser regressions: all 10 scenarios passed using local Next.js and the
  installed Chromium executable with controlled API responses.
- TypeScript: `tsc --noEmit` passed.
- Targeted ESLint: passed with two existing unused image-rule suppression
  warnings in the profile page and Header.
- Backend SQLite: 136 tests, 133 passed, 3 skipped, 6125 assertions. Includes
  ConsumerProfileTest, Identity, Answer24ChannelTest, Notifications and
  OpenApiCoverageTest. Targeted Pint passed.
- Desktop and mobile captures inspected for the profile, communication
  dependencies and stale wallet warning; no approved baseline comparison run.

## Acceptance clarification

Journey 4 acceptance criteria (supersedes link wording in the historical Trello
export, consistent with backend decision D-050):

- Request an email change and receive a **six-digit verification code** at the
  new address through the configured email service.
- Keep the current login email active while the new address is pending.
- Reject incorrect, expired and reused codes without changing the login email.
- Confirm the correct code, then refresh and sign in again to verify the new
  verified email is persisted and used for login.

Preserve the original Trello export as historical source text. Apply code-based
criteria to both journey 4 and the security requirement about expired/reused
verification credentials.

## Automated coverage

Run `npm run test:e2e:profile` against a running frontend (`BASE_URL`, default
http://localhost:3000). Install the browser with `npx playwright install chromium`,
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable.

The suite controls API responses and exercises the actual React page and header:

1. Profile fields, consent, wallet and desktop screenshot.
2. Persistent load error and retry recovery.
3. Saved details on reload and invalid-name rejection.
4. Avatar upload/removal, header avatar, draft retention and upload failure.
5. New draft entered while a details save is pending.
6. Delayed avatar snapshot after a successful details save.
7. Failed consent update overlapping a successful avatar upload.
8. Effective expiry-email state under consent, master and event switches.
9. Password mismatch UI and password-confirmed Fortify 2FA setup.
10. Stale wallet warning on desktop and mobile, with screenshot.

Backend evidence is in ConsumerProfileTest, EmailVerificationCodeTest,
Identity tests, Answer24ChannelTest and Notifications tests. These cover real
application validation, ownership, private avatar storage, OTP lifetime,
password/token/session effects, independent consent, reminder suppression and
delivery decisions without exercising a production mail provider.

Screenshots from the browser suite are stored in ignored `test-results/`.
They are captured evidence, not approved visual baselines. Final screenshot
matching, ten integrated journeys against real APIs and email transport,
and production-like reminder/wallet journeys still need release evidence.

## Real-service release evidence — 2026-11-03

All ten complete release journeys remain unverified. The local real-service
smoke check establishes partial evidence for journeys 1 and 2 only; the other
eight integrated journeys remain **NOT RUN**. The controlled-response
regressions are a separate suite, not evidence for these ten Trello journeys.
Record the tested frontend/backend revisions,
environment, browser/viewport, date, result and artifact paths for every row;
omit passwords, verification codes, tokens and session cookies from artifacts.

| Journey | Required real-service evidence |
| --- | --- |
| 1. Profile loading | Verified consumer login; persisted fields, avatar, consent and authoritative wallet agree with services. |
| 2. Personal data | Save, reload and reauthenticate; invalid input leaves persisted data intact. Also enter a newer draft during an outstanding save. |
| 3. Profile photo | Upload, replace, remove and reload; authenticated header follows each change; reject unsupported/oversized files. Overlap avatar and details saves and confirm neither reverts the other. |
| 4. Email change | Mailbox delivery and six-digit code criteria above, including invalid/expired/reused code rejection and final login. |
| 5. Password security | Correct current password, old/new login attempts, incorrect password, throttling and expected session/token effects. |
| 6. Notification preferences | Reload and reauthenticate; independent consent, master and event switches persist; actual promotional dispatch respects them. Overlap a failing consent update with an avatar save. |
| 7. Voucher reminders | Eligible Answer24 voucher; days 30/60/80 decisions and actual delivery, claim suppression and queue redelivery without duplicates. |
| 8. Wallet consistency | Start at €12.20; authorized purchase/ledger change updates header and wallet details; API failure/recovery shows the appropriate state; no withdrawal option. |
| 9. Favorites and benefits | Profile/preference changes preserve favorites, categories, issued vouchers, claims and transaction ownership. |
| 10. Access and recovery | Second consumer cannot access/update the first; verify audit/request IDs, storage/API failures, retries, no secrets and no partial account changes. |

Required inputs: a designated acceptance environment and test consumers, a test
mailbox with delivery evidence, queue/reminder and Answer24 test services, and
authorized wallet fixtures/failure controls. No integrated pass is established
by the available controlled browser results.

## Approved visual comparison

Status: **NOT RUN**. `docs/profile-page-screenshot.png` and browser-suite captures
have no recorded approval provenance for use as desktop/mobile baselines.
Do not approve a new baseline merely by capturing the current implementation.

For each approved reference, record the source path, approver/date, locale,
viewport/device scale and account state. Capture the matching real authenticated
page, retain reference/current/difference artifacts, and record the comparison
result and any explicitly approved differences. Desktop and mobile must both
pass before screenshot matching is accepted.
