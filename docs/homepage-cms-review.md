# Homepage and inline CMS review corrections — 2026-10-31

Local implementation complete; automated verification passed. Live-service acceptance remains unverified. Existing unrelated working-tree edits are preserved. No commit, push, deployment or migration is performed by this task.

## Changes

1. Wallet starts at zero and is usable only after an authenticated, owner-matched summary succeeds. Failed fetches clear amounts/goals and show unavailable. In-flight summaries are scoped by user and locale.
2. Draft save returns success/failure. Publication and schedule save stop on validation/conflict errors. Operation locking prevents overlapping saves, and edits made during a save remain dirty.
3. Cancel returns to the independently fetched public snapshot; saving a draft does not alter it. Preview does not reload the stored draft.
4. Request cookies/browser language choose the server homepage and metadata locale. Locale switching refreshes server metadata and fetches the independent public translation. Wallet, search, coupon, hero and CMS controls have NL/EN copy. Shared navigation/footer use the CMS snapshot on the homepage.
5. Homepage/coupon reads bypass Next.js, client and HTTP caches. Homepage schedule eligibility is checked each request. Visible coupons expire with a timer. Existing CMS publication/restore invalidation remains in place.
6. Search abort controllers belong to the React effect; cleanup cancels debounce and request. Aborted or mismatched query results cannot overwrite the current query.
7. No default EUR 50 voucher target. Progress requires a returned savings goal and is explicitly a personal savings target.
8. Coupon action says View webshop details / Bekijk webshopdetails, matching its internal destination.
9. Inline controls now expose all content fields, nav links, footer blurb, featured-merchant mode/slugs/count, section visibility/order with drag-and-drop and keyboard buttons, and image crop/focal selection/upload. Desktop/mobile hero variants and SEO image use existing Super Admin asset upload; public picture sources select mobile assets. Backend schema validates the rendered optional sections and responsive asset IDs. Draft saves remove resolved image URLs.
10. Restore lists dated/numbered locale-specific versions, permits inspection of resolved historical content, and requires explicit selection and confirmation before publication.

## Verification

- TypeScript: PASS at verification checkpoint.
- Backend HomepageCmsTest: 10 passed, 66 assertions.
- Backend HomepageCmsTest + CmsScheduleAndSuggestionTest + OpenApiCoverageTest: 22 passed, 5293 assertions.
- Five real local HTTP captures: backend docs/api/HOMEPAGE_HTTP_CAPTURE.json; isolated SQLite, running PHP HTTP server, synthetic actors; includes admin history 200/401/403 and public English homepage/coupons. Temporary database/tokens/server removed.
- Browser regression suite: e2e/homepage-cms-regressions.spec.ts with playwright.homepage-cms.config.ts, installed Chrome. Eleven core regressions passed together; expanded run passed those eleven plus desktop/mobile layout. Coupon destination/expiry passed its isolated rerun and the final deterministic clock run (1 passed, 11.8s); expiry uses the browser test clock to avoid depending on wall-clock startup delays. Controlled API fixtures are separate from backend authorization/persistence verification.
- Final isolated desktop/mobile rerun: PASS (6.4s) after restarting preview and waiting for DOM content plus explicit page readiness; an earlier parallel retry timed out on navigation load.
- Desktop/mobile screenshots were visually inspected: [desktop](homepage-desktop.png), [mobile](homepage-mobile.png). No horizontal overflow at 390px.
- Targeted ESLint: PASS, zero errors and five unused image-rule suppression warnings. Targeted backend Pint: PASS. Changed-source git diff whitespace checks: PASS.
- Real HTTP capture fixture cleanup verified; no fixture database remains.

## Limits

No screenshot/reference was supplied for exact visual comparison. These checks do not establish production provider behavior, real-service authenticated browser acceptance, or deployment performance. The homepage still uses a saved publication visibility window; scheduling is not represented as a separate queued revision publication system.

## 2026-11-03 follow-up

The revision check and inline queued publication workflow are implemented. Supplied live reference, deployed measurements, browser attempts and current limits are recorded in [the follow-up](homepage-publication-review-2026-11-03.md); this supersedes the scheduling and absent-reference limits above.
