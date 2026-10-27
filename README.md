# ShopBonus frontend

Next.js frontend connected to the existing Laravel backend. No backend source or configuration is changed by this integration.

## Local run

Start the backend using its existing `start-local.ps1`, then in this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Defaults target http://localhost:8000. Copy `.env.example` to `.env.local` when overriding settings:

- `BACKEND_URL`: server-only Laravel origin, without /api/v1.
- `BACKEND_STATEFUL_ORIGIN`: an origin already allowed by Laravel's Sanctum configuration. Locally this is http://localhost:3000. When omitted the proxy uses the incoming frontend origin.
- Do not put these in NEXT_PUBLIC variables. The browser calls only the frontend's same-origin `/api/backend/*` routes.

The local backend currently prevents registration until its owner publishes Terms and Privacy documents. The frontend disables signup with the corresponding explanation. See [API issues and verification](docs/BACKEND_API_ISSUES.md).

## Integrated screens

- Public webshops, categories, search and pagination; webshop details and affiliate visit redirects.
- Public offer listings and details. Wallet purchase quotes and confirmed checkout creation, with a stable per-session idempotency key and server status refresh.
- Native Laravel login/register/logout, real verification/resend codes, authenticator challenge, forgot/reset password.
- Consumer wallet, vouchers and authorized code reveal, transaction pagination, disputes, favorites, profile/email/password changes and communication preferences.
- Merchant workspace creation/selection, business profile, onboarding progress, DNS/file/email ownership checks, agreement acceptance.
- Merchant dashboard/analytics, offer create/edit/status changes, code import preview/commit/reveal/invalidation/export, voucher redemption, notifications, funding and invoices.
- Admin cockpit/activity/users/webshops/disputes/incidents/finances; password confirmation, user status and webshop review/status changes, dispute status/resolution without compensation.
- Callback routes matching backend-generated links: `/checkout/:id`, `/workspace/funding?top_up=:id`, `/claim/:token` and `/reset-password`.
- Published CMS pages at `/informatie/:slug`, including legal document versions used by signup.

Other backend capabilities (e.g. integration credential management, banner editor, AI support, full CMS authoring and sensitive admin compensation) have no UI in this frontend integration.

## Session and security

The authoritative identity is GET /api/v1/me. No browser-stored demo role, wallet balance, voucher or password is used. UI gates aid navigation; Laravel remains responsible for authorization and workspace permissions.

The server-side proxy streams API bodies and downloads, forwards session cookies, CSRF tokens and checkout idempotency keys, and preserves upstream status/validation/request-ID/rate-limit headers. Cookies are made host-only for the frontend while retaining HttpOnly/Secure/SameSite attributes. Only the fixed upstream API prefix and named Fortify endpoints are exposed. Mutations require a matching frontend Origin and Laravel CSRF validation. The proxy never accepts an upstream URL from a caller.

Do not replay mutation requests automatically. Consumer checkout retries keep the same idempotency key. Merchant funding does not support request-level idempotency in the existing backend; see the issue report before retrying an uncertain top-up.

Private and catalog data are fetched without shared caching. The existing per-request CSP nonce and security headers remain. Production requires TLS and a trusted reverse proxy, as before.

## Validation

```sh
npm run typecheck
npm run lint
npm run build
npm run test:integration
npm run test:security
npm run test:api
```

The integration/security smoke test uses a controlled HTTP backend and an isolated production Next.js server to check proxy behavior, cookie/CSRF forwarding, status propagation, checkout headers, demo-role rejection, rendered pages, CSP nonces and unavailable-upstream errors. No real account or payment is created.

`test:api` inspects the running local Laravel server: public reads, unauthenticated access and deliberately empty registration/login submissions. It does not provision data, publish legal pages or send payment requests. Authenticated and provider end-to-end tests still require valid test accounts, published documents, approved workspaces and configured provider sandboxes.

Source is organized under app routes, features/auth, features/shopper, features/live, lib/api and server/backend. Fictitious fixtures remain only as unused legacy data/type helpers and static editorial images; active account/catalog/dashboard routes do not return fixture records.
