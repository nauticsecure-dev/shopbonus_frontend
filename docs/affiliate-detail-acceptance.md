# Affiliate detail acceptance

2026-11-01, uncommitted local checkpoint. Inline claim/reveal, copy and tracked
shopping actions replace offer-page navigation as the primary code action.
Unavailable codes are disabled; guests sign in with a return URL. NL/EN UI,
categories and dates follow the shared locale. The official-site link explains
that it does not track cashback. Consent subscribes through useSyncExternalStore
with a null server snapshot; slug navigation remounts detail state. Prepaid
voucher cards remain outside this presentation.

Executed: TypeScript and targeted ESLint pass. Chromium fixture suite
e2e/affiliate-detail.spec.ts: **3 passed**, covering Dutch desktop inline reveal,
tracked link and sold-out control; English mobile labels/date/no horizontal
overflow; guest sign-in without claiming inventory. Inspected screenshots:
[desktop](affiliate-detail-desktop.png), [mobile EN](affiliate-detail-mobile-en.png).
These are controlled API fixtures. The reference image was not supplied, so
pixel-close fidelity and real-provider acceptance remain unverified.

Backend behavior, commands, migrations and limitations:
[review](../../shopbonus_backend/docs/discovery/AFFILIATE_DETAIL_REVIEW.md).
No deployment, production-data mutation or live provider verification.
