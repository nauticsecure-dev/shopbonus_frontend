# ShopBonus

Next.js App Router application with TypeScript, React and Tailwind CSS. The current account, merchant, admin and shopper flows use public demonstration fixtures. They are not production authentication or financial records.

## Run locally

Use Node.js 22 LTS or a supported newer LTS version.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/account?mode=login. Use a fictitious email and password. Demo verification code: **123456**. No emails are sent and passwords are not saved. Browser storage is editable by the visitor and grants no server permissions.

For the optional database health endpoint or migrations, copy `.env.example` to `.env.local` and supply your own PostgreSQL connection string. Environment files are ignored by Git; never put secrets in `NEXT_PUBLIC_*` variables.

## Project structure

```text
src/
  app/
    (marketing)/       # Public pages: home, webshops, discount codes, about, help
    (demo)/            # Account, admin, dashboard, onboarding and shopper demo
    api/               # HTTP route handlers
    fonts/             # Bundled local font
    globals.css        # Global styles and design tokens
    layout.tsx         # Server root layout
  components/          # Shared navigation, branding, cards and toasts
  features/
    auth/              # Demo session context and merchant navigation gate
    dashboard/         # Dashboard shell, panels, charts and icons
    home/              # Interactive home components
    shopper/           # Demo shopper state
  fixtures/            # Public fictitious data, never private production records
  providers/           # Client provider composition
  server/
    db/                # Server-only PostgreSQL access and schema
    demo.ts            # Server-side demo availability checks
  proxy.ts             # Per-request CSP nonce and HTML cache policy
scripts/
  security-smoke.mjs   # HTTP checks against isolated production servers
```

Route groups organize source code without changing URLs. Keep route handlers thin, domain UI and state in `features`, reusable UI in `components`, and secrets/database access under `server`. Server modules must import `server-only`. Avoid barrel files that mix client and server modules. Add new directories when they have real code, rather than scaffolding empty folders.

This follows the supported [Next.js project conventions](https://nextjs.org/docs/app/getting-started/project-structure); Next.js does not prescribe one universal folder structure.

## Production behavior

```sh
npm run build
npm start
```

Without `ENABLE_DEMO_MODE=true`, demo pages render not found and the dashboard, voucher and transaction demo APIs return HTTP 403. The public catalog API remains available. Local development enables demos automatically. Setting `ENABLE_DEMO_MODE=true` explicitly makes demo flows public, including the admin fixture view. It does not enable real authentication. Never connect these flows to real customer data.

Production uses a fresh CSP nonce per HTML request, so pages render dynamically and must not be cached by a shared CDN. The CSP allows images from `images.pexels.com` and inline styles used by existing charts. Production scripts require a nonce; development also allows eval for Next.js debugging. See [Next.js CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy).

## Checks

```sh
npm run typecheck
npm run lint
npm run build
npm run test:security
npm audit --omit=dev
```

The targeted `@esbuild-kit/core-utils` override patches Drizzle Kit's legacy `esbuild` dependency. Keep it until the upstream loader uses a patched version; verify `drizzle-kit export --config drizzle.config.ts` when changing it.

After moving routes, regenerate route types with `npx next typegen`. Old `.next/dev/types` files from a previous development session may need removal after stopping that session. The security smoke script needs a completed build; it starts and stops its own production servers with isolated demo/database environment settings.

`GET /api/health` returns `{ "ok": true }` only when a database query succeeds. It returns HTTP 503 and `{ "ok": false }` when unavailable, without exposing connection details. Database connections and statements have timeouts.

## Before real accounts go live

Replace demo sessions with a maintained server authentication solution, secure HttpOnly cookies, server-side role and resource ownership checks, validated mutations, CSRF protection, rate limiting and persistent records. Authorization belongs in each data access path and route handler, not only navigation gates or Proxy. Follow the [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security).

Terminate HTTPS at a trusted reverse proxy and configure HSTS there for the whole origin, including API and static responses. The app also adds HSTS to HTTPS page responses. Use a least-privilege database account with verified TLS in production. Keep dependencies and the lockfile patched and run the checks above before deployment.
