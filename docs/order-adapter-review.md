# Order adapter consumer follow-up — 2026-11-03

Frontend HassanDev parent `bd76ff420cda1aa180e45e44a521ff0707670b3f`; changes uncommitted alongside preserved existing work.

Removed unconditional immediate-cashback/no-pending promises from Mijn voordelen. The wallet context now retains the actual `pending_cashback_minor` projection (legacy `pending_minor` fallback), validates it as a nonnegative safe integer, clears it on failure/logout and scopes it to the verified wallet owner. The page shows any nonzero pending cashback separately from available credit and checkout reservations. It never adds pending credit to spending power.

Backend policy was already revised by the owner on 2026-11-02: new validated attributable rewards default to immediate credit; frozen historical approval/settlement rules still apply. This follow-up changes no reward or spendability policy. Neutral copy supports both histories and active rules.

Also added merchant App Store credential inputs for Ecwid/E-Series, Squarespace and PS9 native Webservice reads. Drafts are scoped to workspace/platform, use password fields for secrets and clear after successful saves. Only the selected provider's keys enter its create/replace request. Existing connection verification and permission enforcement remain server-owned.

PS/OpenCart connection instructions now include a candidate ZIP download action using the backend webhook origin. Final PS browser rerun passed and asserts the exact package URL. Targeted ESLint passes for wallet context/types and both new browser tests; existing page-level issues below are retained.

Executed: TypeScript passes; Chrome Playwright `e2e/benefits-pending-balance.spec.ts` and `e2e/adapter-credentials.spec.ts` pass (4 tests, mocked API, actual Next.js UI). Three merchant cases assert exact request contracts and cleared inputs after creation. The first merchant fixture's invalid health response was corrected before the final passing run. Targeted ESLint reports 5 existing `react-hooks/set-state-in-effect` errors on unchanged benefits-page effects, 2 existing errors on unchanged App Store loader effects, plus an existing unused image-rule suppression warning. Shared wallet context/types and new browser tests add no reported lint failures. Genuine provider-backed balances/full product journeys NOT RUN.

Backend package links, tested boundaries and remaining provider/merchant acceptance are recorded in sibling `shopbonus_backend/docs/integrations/ADAPTER_REVIEW_2026-11-03.md`.
