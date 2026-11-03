# Consumer platform: local real-service evidence — 2026-11-03

Owner selected **local** for this follow-up. Status: focused local checks passed;
complete release/operational acceptance remains **PARTIAL**.

Frontend `HassanDev` base `bd76ff420cda1aa180e45e44a521ff0707670b3f`;
backend `HassanDev` base `b92f46ab2b471fc4796310e059568bdddde276a4`.
These are tested working trees with pre-existing uncommitted changes, not an
immutable release SHA. No commit, deployment, provider activation or application
database migration was performed.

## Real services and isolation

The harness starts actual Laravel HTTP and Next.js processes and drives installed
Chrome. It does not fabricate/intercept API responses. It uses a separate SQLite
database containing 200 synthetic shops, 1,001 offers and 2,008 codes, database
cache/session/queue drivers, and captured local notifications. Synthetic eligible
orders/invitations do not establish an external Answer24 handoff. Verification
codes are read from local queued notifications; external mailbox delivery is
not demonstrated. Passwords, codes, invitation tokens and session cookies are
omitted from result artifacts.

The configured developer database and `.env` files were not modified. The final
temporary database was removed and the owned frontend server on port 3340 was
stopped. Generated TypeScript includes from this harness were removed while
preserving unrelated includes.

## Local scenario coverage

These are the checks actually executed in the ten scenario areas, not a claim
that every release subcriterion or every profile-card journey has passed.

| Area | Executed local evidence | Result |
| --- | --- | --- |
| 1. Homepage | Published NL/EN CMS headings, locale switch, persisted rejection of optional cookies, desktop/mobile captures and mobile overflow check. | PASS |
| 2. Discovery | Real search/category/has-offers/sort requests, disjoint page 2, 12-item pagination, public projection and browser search. | PASS |
| 3. Shop detail | Clean-slug browser detail and API projection without tested private owner/integration/order fields. | PASS |
| 4. Offer detail | Actual 250-point price, paused/expired/sold-out public states, anonymous safe return destination and no checkout created merely by viewing. | PASS |
| 5. Direct registration | Browser registration, genuine session/CSRF, queued-code verification, already-verified rejection and return to the intended offer. | PASS |
| 6. Activation | Browser preview issues nothing; activation associates one voucher; same-consumer HTTP retry returns without a second association. | PASS |
| 7. Token protection | Forged 404, expired/revoked 410, wrong-recipient 403, foreign replay 410, no recipient email in failure bodies, persisted denial audit. | PASS |
| 8. Points and purchase | Available 300, pending 1,000 and reserved 100 points; insufficient-points checkout disabled; actual 250-point browser purchase leaves 50 available, one debit and unchanged EUR credit. Actual points activity renders; another consumer has zero owned rewards and cannot read the buyer's transaction. | PASS |
| 9. Profile/security subset | Browser name save/reload, persisted API language/preferences, new-email request retaining old email, wrong-code 422, correct-code 200, reused-code 409 and new-address login. | PASS |
| 10. Operational subset | Genuine 401/403/404/419/422/429/500 paths, local public-cache invalidation after pausing an offer, wallet-table failure/restoration, measured HTTP latency, API coverage tests and Composer audit. Full accessibility, current npm clearance, approved-reference comparison and staging remain open. | PARTIAL |

Areas 1–8 are recorded in `consumer-platform-local-opcache-results.json`.
That run's area 9 failed because the harness tried to decrypt an unencrypted
security-notice job. Fixed the queue decoder to handle both ordinary and
encrypted jobs, verified its six-digit code against the pending request without
recording the code, and reran areas 9–10. Their final results are in
`consumer-platform-local-results.json`; targeted-run account/wallet/voucher
preconditions are established through real HTTP.

The earlier failed harness assertion is retained, not presented as an application
failure. Code-reuse acceptance uses the actual documented 409 conflict when no
pending email change remains. The separate ten comprehensive profile journeys
(including avatar, password/MFA, reminder transport and other failures) are not
closed by this focused platform run.

## Local API latency

Final measurement: PHP 8.4.25 loopback development server with its bundled
OPcache enabled only for this isolated process, Xdebug disabled, SQLite file,
database cache, sequential requests. Browser page activity is stopped before
timing. PHP opcode cache is warm; “cold” means discovery-cache invalidation before
each sample. Fixture control/bootstrap time is outside the timed request.
HTTP/network, application bootstrap, SQL and response body are included.

Each row retains all **100 raw samples** in
`consumer-platform-local-results.json`; P95 is sorted sample 95 of 100.

| Endpoint/mode | P50 | P95 | Local <300 ms |
| --- | ---: | ---: | --- |
| Directory, discovery-cache cold | 149.48 ms | **257.74 ms** | PASS |
| Directory, repeated four-query mix | 83.01 ms | **106.28 ms** | PASS |
| Authenticated dashboard | 106.09 ms | **146.01 ms** | PASS |

The four directory paths include broad search, category plus available offers,
name sorting and no-match search. The authenticated account has two owned
vouchers and explicit points/pending/reserved/EUR balances.

Retained earlier measurements show why environment details matter:

- No OPcache, browser active: cold/repeated/dashboard P95
  1,034.31 / 755.10 / 912.58 ms
  (`consumer-platform-local-benchmark-results.json`).
- OPcache, browser active: 235.58 / 290.15 / 338.82 ms
  (`consumer-platform-local-opcache-results.json`).
- An initial webpack attempt and concurrent supplemental PHP test encountered
  Windows paging/heap exhaustion. The interrupted attempt produced no complete
  acceptance report. Sanitized first-attempt logs are retained.

No global PHP configuration or production API code was changed to obtain these
numbers. The final measurements establish a local target only; they do not
replace representative staging/MySQL/Redis/concurrent-load evidence or revise
the historical 431.16 ms SQLite HTTP-kernel benchmark retroactively.

## Other verification and remaining approval

- Serial backend `ConsumerPlatformE2ETest`, `PointsCheckoutTest` and
  `OpenApiCoverageTest`: **21 passed, 8,035 assertions**. JUnit:
  `../../shopbonus_backend/docs/release/consumer-platform-local-tests.junit.xml`.
- Fresh Composer audit: zero advisories/abandoned packages, in
  `../../shopbonus_backend/docs/release/consumer-platform-local-composer-audit.json`.
- Final frontend TypeScript and scoped CJS ESLint: PASS. Scoped whitespace checks:
  PASS. The earlier documented five dashboard hook-effect lint errors remain
  outside this test-harness change; no full-project lint-clean claim is made.
- Fresh npm advisory requests failed under restricted networking. Automatic
  approval review rejected the escalated npm request because dependency metadata
  would leave the local environment. The separate approval question remains
  pending. No clean current npm result or dependency remediation is claimed.
- Real-API desktop/mobile captures are
  `consumer-platform-local-{home,dashboard}-{desktop,mobile}.png`.
  They are inspection evidence, not approved visual baselines. The final dashboard
  captures wait for actual points activity, rather than capturing its loading state.
- Full accessibility, external mail/Answer24 delivery, Redis/distributed behavior,
  deployed cache invalidation and approved-reference comparison remain unverified.

## Reproduction

From the frontend directory, run:

```powershell
php -d xdebug.mode=off scripts/consumer-platform-local.php
```

This owns port 3340 and refuses to overwrite an existing fixture database. On
Windows the runner needs permission to stop its child processes; the successful
final runs used the approved process-management permission. It enables bundled
OPcache for the isolated HTTP server when available. No credentials are required
for an existing environment: the script creates synthetic accounts in its own
fixture and removes that database afterward.

The targeted final profile/operational reproduction used:

```powershell
$env:CONSUMER_LOCAL_JOURNEYS = '9,10'
php -d xdebug.mode=off scripts/consumer-platform-local.php
Remove-Item Env:CONSUMER_LOCAL_JOURNEYS
```

Keep earlier reports before reruns: the default output filenames are replaced.
No full ten-journey release approval should be inferred from local PASS labels.
