# Merchant dashboard and vouchers — 2026-11-02

Implemented offer settings, queued import/export status, reusable voucher references, dispute pagination and dashboard comparisons/summaries. Evidence and release limits: [backend review](../../shopbonus_backend/docs/merchant-voucher-review.md).

Browser fixtures: `e2e/merchant-voucher-review.spec.ts` — 5 Chrome journeys pass, including 390px editor. Fixtures do not establish actual provider/authenticated staging operation. TypeScript and targeted ESLint pass.

Dependency scan: [npm audit](merchant-voucher-npm-audit.json) reports 25 vulnerabilities, including one critical; release acceptance remains partial.

Follow-up: upgraded Next.js and eslint-config-next to 16.4.4, PostCSS to 8.5.32; the lockfile now resolves sharp 0.35.5. [Fresh audit](merchant-voucher-npm-audit-followup.json): 20 moderate, zero high/critical. [Production-only audit](merchant-voucher-npm-audit-production.json): zero vulnerabilities. Remaining moderate findings are in the development tooling chains (minimatch and the legacy esbuild loader under drizzle-kit); npm proposes major downgrades such as ESLint 4 and eslint-config-next 0.2.4. Do not apply these blindly or claim a clean full audit.

TypeScript, targeted ESLint and production webpack build (65 pages) passed after the dependency update. Existing metadataBase warning remains. Real local dummy-session browser evidence and small sequential timing samples: [acceptance JSON](merchant-voucher-local-acceptance.json), [desktop](merchant-voucher-local-desktop.png), [390px editor](merchant-voucher-local-mobile.png). The harness authenticates through real Sanctum/CSRF and calls the running Laravel API without interception. Reproduce from the backend with `php scripts/capture-voucher-inventory.php --browser`; no external account/password is needed. Initial cold dashboard wait timed out; rerun assertions passed, then browser shutdown hung and the confirmed helper tree was terminated. Cleanup was bounded before the final rerun; see the backend follow-up for final execution status.

The small local timing sample is not representative staging performance. Full provider/mobile/worker/concurrency acceptance remains distinct from these checks. Full brief mapping: [backend follow-up](../../shopbonus_backend/docs/merchant-voucher-acceptance-followup.md).

2026-11-03 offers/code findings: [implementation, acceptance correction and current evidence](../../shopbonus_backend/docs/offers-code-review-2026-11-03.md).
