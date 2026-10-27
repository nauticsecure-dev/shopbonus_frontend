# Integration validation — 2026-10-27

## Executed checks

- `npm run build`: passed, including production TypeScript checking and all application routes.
- `npm run lint`: passed with zero errors and five existing `no-img-element` warnings in the editorial/help and unused legacy home components.
- `npm run test:integration`: passed all eight check groups. `test:security` delegates to this same suite.
- `node scripts/backend-audit.mjs`: completed against the real Laravel server; results are described in BACKEND_API_ISSUES.md.
- `git diff --check`: passed under the repository's normal Windows line-ending configuration.
- Backend Git status after integration matches the pre-existing modified/untracked file list. No backend source, configuration, docs, migrations or seed data were changed by this task.

## Real backend through the production frontend proxy

Verified at http://localhost:3000 with Laravel running at http://localhost:8000:

| Request | Actual result |
| --- | --- |
| GET /api/backend/api/v1/public/categories | 200; twelve categories |
| GET /api/backend/sanctum/csrf-cookie | 204; session/CSRF cookies received |
| POST /api/backend/login, empty JSON and real CSRF | 422 validation_failed |
| POST /api/backend/register, empty JSON and real CSRF | 503 legal_documents_unavailable |
| GET /api/backend/api/v1/me without authentication | 401 |

These submissions cannot create an account. No credentials, verification codes, or session cookies were printed or saved in this report.

## Controlled integration suite

Passed: public catalog/query/no-store forwarding; session cookie attributes and CSRF forwarding; matching Origin checks; rejection of missing/foreign Origin and invalid paths; preservation of 401/403/409/419/422/429/500, request IDs and Retry-After; checkout body/Idempotency-Key forwarding; multipart CSV uploads; rejection of forged demo roles; production page rendering/CSP nonces/cache policy; safe 502 responses when the upstream is unavailable.

The suite caught an initial local-Origin comparison bug, which was corrected to use the actual Host header because Next.js normalizes localhost aliases. The final suite passed after that correction.

## Not verified

Successful real account registration/login, delivered email codes, persisted consumer/merchant/admin mutations and provider payment completion need published legal documents, usable test identities and configured sandbox providers. No financial transaction was submitted. Mock transport tests are not evidence of those real business outcomes.

Visual/hydration verification could not be completed: the in-app browser webview repeatedly timed out attaching, and native Chrome state capture also timed out. Production HTML responses and API transport were verified by HTTP. The frontend production server was left running locally on port 3000.
