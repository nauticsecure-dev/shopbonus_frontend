# Registration and CSRF review — 2026-11-03

Status: implementation fixed; release acceptance PARTIAL. Changes are uncommitted on HassanDev; unrelated working-tree changes were preserved. Backend base b92f46a. No deployment, live account creation, schema migration on the application database, or provider activation.

## Changes

- Logout no longer suppresses persistent 419 responses. The shared API client refreshes CSRF once and retries once; a second rejection reaches the existing recoverable logout UI and SessionContext retains identity. Only a successful logout or a 401 from logout itself confirms completion. A 401 from CSRF initialization is an error.
- CSRF initialization checks the HTTP response and readable cookie, shares concurrent initialization for initial reads and writes, reuses an existing cookie, and forces refresh after 419. Initial API reads establish one anonymous session before proceeding, avoiding competing Set-Cookie responses replacing a new login. Authentication helpers no longer bootstrap twice. Multipart uploads share the same handling and support bearer uploads omit cookies/bootstrap.
- Session refresh preserves existing identity on a network/server error.
- Authentication forms wait for session initialization before enabling submit; registration also waits for legal requirements, with explicit loading/unavailable/retry states. This fixes premature form interaction and an observed browser race where a premature click displayed registration-unavailable despite a successful legal endpoint.
- Backend `.env.example` documents all 334 env keys referenced by application config, including optional commented settings. Duplicate active CMS settings were removed. Session/CORS/Redis/verification/owner security defaults are explicit. Frontend example documents the current www frontend/app backend deployment and rebuild requirement. Actual secrets remain unset; optional catalogue entries remain commented to preserve config defaults.

## Executed checks

- `node --test tests/auth-csrf.test.cjs`: 16 passed, including actual SessionContext state retention after failed logout and clearing after success, concurrent initial reads/registration sharing initialization, and CSRF-bootstrap failures not being mistaken for a confirmed absent session.
- Backend PHP 8.4.15 identity suite: 63 passed, 351 assertions. Includes consumer/merchant signup, legal consent and privileges, uniqueness, verification/expiry/replay/throttles, password recovery, account status and failed-CSRF logout retention. JUnit: `../shopbonus_backend/docs/release/auth-registration-review.junit.xml`.
- `php scripts/check-env-example.php`: 334 config keys documented, no duplicate active keys. `--write` appends newly missing optional settings without activating them.
- Targeted PHP Pint, frontend TypeScript and targeted ESLint passed.
- Composer audit: zero advisories/abandoned packages (`../shopbonus_backend/docs/auth-composer-audit.json`). npm production audit: zero advisories (`auth-npm-audit-production.json`). Full audit: 20 moderate development-tool advisories, zero high/critical (`auth-npm-audit-all.json`). Development dependency remediation remains open; no forced major updates were applied.

## Deployed probes

Public site: https://www.shopbonus.nl/; backend discovered from its CSP: https://app.shopbonus.nl/.

- HTTPS homepage returns HSTS, CSP, nosniff and frame-denial headers.
- GET CSRF cookie from trusted www origin returns 204, matching Access-Control-Allow-Origin and credentials=true. XSRF and session cookies use `.shopbonus.nl`, Secure and SameSite=Lax; only session is HttpOnly, allowing the SPA to read XSRF.
- The untrusted-origin probe receives no CORS permission. Cookie values are redacted in `auth-deployed-cookie-probe.json`.
- POST `/register` with deliberately empty data and no CSRF header returns 419 `csrf_token_mismatch`. After the real cookie handshake, the same empty payload with decoded X-XSRF-TOKEN returns 422 `validation_failed`, establishing successful CSRF validation without creating an account. Captures: `auth-deployed-registration-probe.json`.

Expected 419 security rejections remain enforced. Client recovery fixes do not disable server CSRF protection. These probes validate the current deployed handshake, not deployment of this working tree.

## Browser reproduction and remaining acceptance

Run `php -d xdebug.mode=off scripts/auth-browser-review.php` in the sibling backend with PHP 8.4+, Node and Chrome installed. It creates a dedicated SQLite fixture, runs real Laravel HTTP/Next dev/Chrome journeys and deletes the fixture afterward. Account mail uses a database queue with the array mailer; OTP probes read only encrypted synthetic fixture jobs. TOTP and recovery-code challenges use real Fortify. The failed-logout journey changes only outgoing token/fetch metadata to obtain genuine server 419 responses. No real email is sent.

Final local Chrome run: **9 checks passed**, recorded in `auth-browser-review.json`: consumer registration/keyboard Tab/focus, verification resumption, OTP at 390px without horizontal overflow, login mode/safe next, two genuine 419 logout rejections preserving the session, retry logout with protected 401, real TOTP, recovery-code consumption/focus, and merchant registration/OTP with no workspace membership. Screenshots: `auth-verification-mobile.png` and `auth-login-desktop.png`; visually inspected. The desktop capture includes the brief account-loading state; the reproduction script now waits for readiness before future captures. No screenshot establishes owner-approved reference matching.

Earlier runs exposed legal/session readiness races, lost focus when switching MFA inputs, and an overly short standalone assertion timeout. MFA inputs now remount when switching modes so autofocus runs on the selected input. Next dev also emitted transient compilation/manifest errors before pages recovered; a production build/runtime check was not performed in this review. Browser success is local service evidence, not deployed full-journey evidence.

Still required for release: actual email delivery through the configured provider; Redis-backed queue/retry/failed-job and distributed throttle evidence; staging P95 `/me` <250 ms and signup <400 ms under a representative dataset/load; owner-approved screenshot comparisons; and real deployed MFA/recovery/logout journeys on the chosen release SHA. The URL supplied is the live site, not an approved design reference. No staging credentials, mail provider access, Redis service access or approved screenshots were supplied.
