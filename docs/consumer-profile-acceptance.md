# Consumer profile verification — 2026-10-31

Status: PARTIAL acceptance. The ten real-service journeys in Trello #10 remain
the release target. Browser regressions with controlled API responses do not
prove email transport, reminder dispatch, database persistence, real wallet
purchases, ownership enforcement, or screenshot matching.

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

For journey 4, use a **six-digit verification code**, rather than a verification
link. This follows the established signup and pending-email-change flows and
backend decision D-050. The current login email stays active until the correct
code is confirmed. Expired, incorrect and reused codes must be rejected. Preserve
the original Trello export as historical source text.

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
