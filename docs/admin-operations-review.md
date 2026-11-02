# Admin operations overview — 2026-11-02

The existing `/admin` cockpit now calls `GET /api/v1/admin/operations-overview`
through the existing authenticated API client. It shows API, queue, database,
reconciliation, security, backups/restore, scheduler and incident observations.
Missing or unrecognized states display UNKNOWN. Failed refresh discards old
health states; retry and a visible-tab 60-second refresh are available.

The prior Online inference from cockpit fetch success was replaced by a link
to the observed operations panel. Recovery targets remain UNAPPROVED. Matching
financial evidence means management allocation, as confirmed by the owner;
formal revenue recognition remains unverified. Redis ready wait remains UNKNOWN
where exact eligibility timestamps are absent; enqueue age is not ready wait.

Validated with full TypeScript, targeted ESLint and one real Chrome browser
regression covering missing data, critical queue, last restore, failed refresh
and successful retry. `e2e/admin-operations.spec.ts` uses synthetic HTTP fixtures;
it does not prove production authentication or provider behavior. Screenshot
`docs/admin-operations.png` was visually inspected. Run with installed Chrome:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
npx playwright test --config playwright.operations.config.ts
```

The config uses an existing local app server at `BASE_URL` (default port 3000).
No server is killed by this test. Changes are uncommitted on HassanDev, base
`5abab5083ce7036177d7cbef27688f449d6b0f35`; unrelated edits preserved.
No deployment. Full authenticated frontend/API and production acceptance remain
open; see the backend `docs/reliability/REVIEW_2026-11-02.md` for evidence/limits.
