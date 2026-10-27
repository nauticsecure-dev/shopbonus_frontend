# Backend API issues and integration verification

Date: 2026-10-27 (Asia/Karachi). Target: http://localhost:8000.
Scope: frontend integration only. Existing backend modifications were present before this task; none were edited.

## Confirmed running-server blocker

| Priority | Endpoint | Observed result | Impact / backend-owner action |
| --- | --- | --- | --- |
| High | POST /register | HTTP 503, error.code=legal_documents_unavailable, message=Registration is temporarily unavailable. Captured with a real CSRF session and an empty body; legal availability is checked before field validation. | Signup cannot complete. Publish the real Terms and Privacy documents with current legal versions through the existing backend administration workflow. No fabricated versions or backend changes were applied. |

## Confirmed empty data and local setup limitations

| Finding | Evidence | Impact |
| --- | --- | --- |
| No public shops/offers | GET /api/v1/public/webshops and /public/offers both HTTP 200, data=[], total=0. | Catalog pages display an honest empty state. Approved/published shops, eligible active offers and inventory must be provisioned by the backend owner. This is an empty database condition, not an HTTP failure. |
| No published CMS/legal pages or FAQs | GET /api/v1/public/pages?locale=nl and /public/faq both HTTP 200, data=[]. | Legal-document discovery cannot obtain versions or display the documents; signup is disabled. FAQ/CMS content requires publication. |
| Mail is log-only locally | Existing backend local setup and MAIL_MAILER=log. | Verification/reset/ownership emails are not delivered to an inbox. Real delivery needs the backend owner's mail configuration. No codes or logs were exposed. |
| No supplied authenticated test identities | Existing local setup says no demo user or administrator is seeded; no credentials were supplied. | Successful consumer/merchant/admin workflows could not be tested against live persisted records. Frontend transport checks use a controlled backend. |
| Provider integrations unavailable/unverified | Existing local setup documents disabled/unconfigured live providers. No live payment requests were made. | Mollie checkout/top-up completion, ownership providers and downstream services require configured test environments. Do not interpret a redirect as payment success. |

## Contract issues identified by source inspection (not reproduced with live payments)

1. **Merchant funding creation is not request-idempotent.** POST /api/v1/workspaces/{workspace}/funding/top-ups reads amount_minor only. FundingController::topUp calls MerchantFunding::startTopUp, which creates a fresh FundingTopUp for each request and does not read Idempotency-Key. An uncertain network result followed by retry can create another payment request. Consumer checkout already has explicit Idempotency-Key handling; funding needs equivalent backend support. The frontend does not automatically retry mutations and disables duplicate submission while pending, but cannot guarantee deduplication across network failures.
2. **Fallback legal versions have no discovery endpoint.** Registration's LegalConsents::requiredVersions can accept configuration fallback versions when CMS legal pages are absent, but GET /public/settings does not expose those versions and the page index includes published CMS content only. A client cannot reliably display/echo fallback-only legal documents. The frontend uses published Terms/Privacy pages and their legal.version values. Publish the pages or have the backend owner add a supported metadata/document contract in a separate backend task.

3. **Public promotional offer acquisition is incomplete.** PublicCatalog advertises how_to_obtain=claim for promotional_code offers, but the exposed claim endpoints require an existing secret token rather than an offer slug. The registered routes do not provide a direct consumer promotional-offer claim operation. The frontend supports existing /claim/:token links and does not reveal or invent public codes. The backend owner needs to confirm the intended promotional claim flow or supply the missing API contract.

CSV import is supported; Excel workbooks are deliberately rejected by CodeImporter::linesFromFile with 415 unsupported_media_type. The frontend therefore accepts CSV/text and explains how to export a spreadsheet as CSV.

## Expected responses (not defects)

- GET /api/v1/health and /health/ready: 200.
- Public categories: 200, twelve categories.
- Public settings and cookie policy: 200.
- GET /api/v1/me, /consumer/wallet, /consumer/vouchers, /owner/dashboard and /admin/cockpit without authentication: 401 unauthenticated.
- POST /login with an empty JSON body and valid CSRF: 422 validation_failed.

## Verification and remaining coverage

Run `npm run test:api` to reproduce the live checks. The script emits method/path/status/error summaries and never prints session cookies.

The frontend integration suite checks a separate controlled upstream and production Next.js instance: query/body forwarding, host-only/HttpOnly cookies, CSRF, strict mutation origins, path restrictions, 401/403/409/419/422/429/500 preservation, request IDs, rate limits, checkout idempotency headers, legacy demo-role rejection, CSP/cache headers, page rendering and safe 502 errors.

Successful real login, delivered verification, persisted profile/preferences, workspace onboarding/approval, inventory imports, issued vouchers, payments/refunds and authorized admin mutations remain unverified until the setup blockers above are resolved. The backend itself was not modified or migrated, and no account/offer/payment was created.
