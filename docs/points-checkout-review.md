# Points checkout review — 2026-11-02

Uncommitted HassanDev, parent bd76ff4. Connected points-only checkout and dual-price wallet selection; quote/purchase send wallet_unit, integer points display without conversion, insufficient points block purchase. Unit changes reset quote/terms/key; network retries preserve the key. No mutation on view. Existing EUR flow remains D-053.

Executed TypeScript and targeted ESLint: PASS. Playwright e2e/points-checkout.spec.ts: 3 passed using installed Chrome against local Next port 3025 (API and CSRF fixture interception). Covers points-only, blocked shortfall and dual selection. Genuine backend/provider acceptance remains outstanding. Backend implementation and evidence: ../shopbonus_backend/docs/release/VOUCHER_CHECKOUT_REVIEW_2026-11-02.md.
