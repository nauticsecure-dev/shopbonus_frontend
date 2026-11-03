# Discovery review follow-up — 2026-11-03

Status: PARTIAL overall. Directory localization repaired; staging performance,
complete authenticated platform acceptance, and reference-image fidelity remain open.

Owner subsequently selected local services. The isolated real-HTTP/browser
follow-up and retained raw samples are in
[consumer-platform-local-acceptance.md](consumer-platform-local-acceptance.md).
Final local P95 with process-scoped OPcache and browser page activity stopped:
directory cold 257.74 ms, repeated 106.28 ms; dashboard 146.01 ms, 100 samples each.
Focused registration/activation/token/points/profile checks now add real local
service evidence; staging and complete operational/visual approval remain open.
Frontend branch `HassanDev`, base `bd76ff4`; changes uncommitted. Existing unrelated
working-tree changes preserved. No deployment, migrations, dependencies or API
contract changes. Historical backend evidence remains in
`../../shopbonus_backend/docs/discovery/INTEGRATION_ACCURACY_REVIEW.md`.

## Implementation

- Added typed NL/EN/DE directory copy for voucher loading/unavailable/singular/plural,
  hero and guest summary, search, filters, sorting, empty/error/retry states,
  pagination, card counts and fallback descriptions/prices.
- Categories use the selected label with English/Dutch fallbacks. Directory list,
  category and retry requests send the selected `Accept-Language`; locale changes
  cancel/reload directory requests through the existing stale-response protection.
- Existing backend-provided descriptions, titles and benefit labels retain the
  backend translation contract; frontend copy does not translate merchant content.
- Browser baseline explicitly selects Dutch instead of relying on Chromium's
  English default. Loading-state regressions hold voucher responses until the
  loading label is observed, avoiding a timer-based assertion race.

## Validation

- TypeScript (`npx tsc --noEmit`) and targeted ESLint passed.
- Final fixture suite: **13 passed (44.8 seconds)**. These are controlled API
  regressions, not the ten complete real-service platform journeys.
- Live local Chromium journey: **1 passed** (20.9 seconds for test, 27.8 seconds
  including runner setup/cleanup). Actual Laravel API at `127.0.0.1:8018`, frontend
  at `127.0.0.1:3000`, existing demo catalog. Covers directory rendering, one
  deliberately interrupted transport request followed by retry to the real API,
  real empty search/clear recovery, combined category/search/has-offers/sort,
  desktop/mobile capture, and clean-slug shop detail. API responses are forwarded
  from the real service, with no fabricated success responses or customer mutations.
- The live proxy is for public browsing only: it does not forward authenticated
  session cookies, CSRF state or mutation bodies. Do not use it as evidence for
  authenticated voucher updates, registration or activation.
- First browser runs exposed the previously masked English browser default and a
  timing-dependent loading assertion; these test assumptions were corrected.
- Shared authentication changes during validation added CSRF initialization before
  reads. Fixture sessions now include an explicit test CSRF cookie. The live test
  obtains its CSRF cookie from the actual Sanctum endpoint and maps it to the
  frontend origin used by the local proxy. The lifecycle assertion measures the
  request delta after account-locale hydration, rather than assuming hydration
  always performs exactly one startup request. One explicit focus event must still
  produce exactly one additional voucher request.

Reproduce (PowerShell, frontend and seeded API already running):

```powershell
$env:BASE_URL = 'http://127.0.0.1:3000'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:/Users/Sakhawat Kamran/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
npx playwright test e2e/discovery.spec.ts --workers=1 --reporter=list
$env:DISCOVERY_LIVE_API_BASE_URL = 'http://127.0.0.1:8018'
npx playwright test e2e/discovery-live.spec.ts --workers=1 --reporter=list
```

## Remaining acceptance evidence

| Item | Evidence still required |
| --- | --- |
| Representative P95 <300 ms | Designated staging API with confirmed representative MySQL/Redis infrastructure, catalog, cache states and request mix; cold/warm latency artifacts with environment details. Historical local SQLite/array-cache cold P95 remains 431.16 ms; warm P95 62.97 ms does not close this item. No representative benchmark was run in this follow-up. |
| Ten Trello #18 real-service journeys | Test users, mail/verification access and eligible activation events/tokens for homepage, discovery, shop detail, offer availability, registration, activation, token protection, dashboard, profile/security, and operational quality. Include authenticated voucher mutation followed by directory refresh and outage/reconnect recovery, ownership denial and session failures. Current directory tests cover only a subset. |
| Reference fidelity | Original `image(20261023-121324).png` and intended viewport dimensions, then desktop/mobile comparison. Existing screenshots alone cannot establish pixel-close fidelity. |

The user supplied `https://www.shopbonus.nl/`. Read-only HTTPS checks on 2026-11-03
returned 200 for `/` and `/webshops`, while
`/api/v1/public/webshops?per_page=1` returned HTML 404. This establishes public
frontend reachability only; the supplied URL does not establish the API origin,
staging infrastructure or test-account setup. No load test or customer mutation
was performed on that domain. The first sandboxed fetch was denied; the permitted
read-only network request succeeded.

Next action: obtain the staging API origin and designated test-account/verification
setup, run and retain the ten real-service journey results and representative
performance samples, and compare captures with the missing original reference.
The temporary API server was stopped after validation; the frontend development
server remains available on port 3000.
