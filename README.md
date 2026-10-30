# ShopBonus Frontend

Next.js / React shopper + merchant demo UI for ShopBonus.

## Install

```sh
cd shopbonus_frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000/account?mode=login.

Backend (Laravel) should allow this origin in `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` / `SANCTUM_STATEFUL_DOMAINS`.

## Source structure

```
src/
  app/           # Next.js App Router pages + route handlers
  components/    # Shared UI (header, dashboard, LanguageSetting, …)
  config/        # Public env helpers (NEXT_PUBLIC_* only)
  data/          # Demo fixtures
  db/            # Optional Postgres (health probe)
  i18n/          # Locale provider + dictionaries (nl / en)
  lib/           # Secure API client + input helpers
  store/         # Browser demo session / shopper state
  types/         # Shared TypeScript types (locale, …)
  proxy.ts       # Security headers + production CSP
```

## Internationalization

- Supported locales: `nl`, `en` (matches Laravel `SetRequestLocale`).
- Preference lives in `localStorage` (`shopbonus-locale`) and sets `<html lang>`.
- Profile → Language setting updates the preference.
- `src/lib/api.ts` sends `Accept-Language` on every API call.

## Security baseline

- No secrets in `NEXT_PUBLIC_*` — see `.env.example`.
- Middleware + `next.config.ts` set `X-Frame-Options`, `nosniff`, referrer and permissions policies, CSP, HSTS in production.
- Profile saves sanitize plain text / validate email & password length.
- Sanctum CSRF helper (`ensureCsrfCookie`) for cookie-auth mutations.

## Page flow

- Shopper: account → demo verification → Mijn voordelen → webshops → webshop details → unlock voucher → profile.
- Webshop owner registration: account → email verify → `/voor-webshops` → `/dashboard`.
- Webshop owner login: account → `/dashboard` (live KPIs, offers, notifications, claims chart from Laravel).
- Logout clears the Sanctum cookie session. Dashboard routes require a verified merchant with a workspace.

Overview data uses `/api/v1/workspaces/{id}/dashboard` (and claims/notifications endpoints). The Offers editor may still mix local fixtures for paste UX until fully wired.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```
