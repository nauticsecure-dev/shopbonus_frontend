# Merchant dashboard and vouchers — 2026-11-02

Implemented offer settings, queued import/export status, reusable voucher references, dispute pagination and dashboard comparisons/summaries. Evidence and release limits: [backend review](../../shopbonus_backend/docs/merchant-voucher-review.md).

Browser fixtures: `e2e/merchant-voucher-review.spec.ts` — 5 Chrome journeys pass, including 390px editor. Fixtures do not establish actual provider/authenticated staging operation. TypeScript and targeted ESLint pass.

Dependency scan: [npm audit](merchant-voucher-npm-audit.json) reports 25 vulnerabilities, including one critical; release acceptance remains partial.
