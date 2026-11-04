# Frontend design and interaction review — 4 November 2026

Status: **Issues found and targeted fixes verified. Full release clearance is not established.**

The review used the existing working tree, including its pre-existing uncommitted changes. Those changes were preserved. The frontend ran at `http://localhost:3038`, with the existing isolated acceptance SQLite/API environment at port 8038. Authenticated interaction tests used controlled API responses; they do not establish real provider, authorization, payment, email, or database correctness.

## Design findings and changes

| Priority | Finding | Result |
| --- | --- | --- |
| P1 | Homepage discount-code requests could time out while leaving the loading skeleton visible indefinitely. | Fixed. A timeout now clears loading and displays the existing error message. Cleanup prevents state updates after unmount. A browser test holds the request open and advances time beyond the deadline. |
| P2 | Coupon copy and destination buttons extended beyond the homepage card on narrow phones. Page-level overflow checks alone did not catch this contained overflow. | Fixed. Actions stack within the available card width. Browser tests check both button boundaries at 320, 390, 768, and 1440 pixels. |
| P2 | Homepage merchant images displayed broken-image icons and blank covers when external images failed. | Fixed with a shared `ShopImage` fallback showing merchant initials. It detects failures both after mounting and before hydration attaches `onError`. The final homepage sweep has no broken images at all four widths. |
| P2 | The FAQ search field had a placeholder but no explicit accessible label. | Fixed using the existing localized search copy. Final DOM checks find no unlabelled visible controls on the FAQ page at all four widths. |
| Testing | Three existing authenticated browser fixtures returned an empty CSRF bootstrap response without creating the cookie expected by the current client. The merchant overview fixture also omitted three required KPI fields. | Added test-only CSRF cookies and the required merchant KPI data. All three focused checks subsequently pass. Production authentication was not changed. |

Stable empty-array defaults were also added to the homepage shop and coupon components to avoid unnecessary effect restarts when optional initial data is omitted.

## Remaining issues

1. **P2 — Text contrast.** White 12px text on the webshop card's `#22c55e` offer-count badge has approximately **2.28:1** contrast. White text on the `#0b74ff` brand background has approximately **4.24:1** contrast. These combinations fall below 4.5:1 for normal-size text. Relevant locations include `src/components/DiscoveryWebshopCard.tsx:47`, the header's language and registration buttons, and the brand token in `src/app/globals.css`. Prefer darker text/background combinations, then check all hover, disabled, and focus states. These calculations are specific color-pair checks, not a complete accessibility audit.
2. **P2 — Discount-code localization.** `src/app/kortingscodes/page.tsx` hard-codes Dutch headings, search labels, loading failures, empty-state text, and actions. Its category/code fetches also omit the selected locale. An English/German header can therefore accompany Dutch page content. This is confirmed by source inspection; the full locale matrix for this page was not run.
3. **P2 — Repository lint gate fails.** The baseline has **38 errors and 10 warnings**. Thirty errors are `react-hooks/set-state-in-effect`; eight are `@next/next/no-assign-module-variable` in test/fixture tooling. The errors affect admin lists/CMS/support, merchant settings/orders/banners, FAQ, invitations, discount codes, benefits, onboarding, and the step-up modal. Full machine-readable locations are in `test-results/design-review/lint.json`. Rules were not disabled to conceal these findings. The newly added components, audit script, regression tests, and repaired test fixtures pass their scoped lint check.
4. **P2 — Page rendering depends on unbounded CMS/API fetches.** Server fetches in `src/lib/homepage.ts`, `src/lib/discoveryServer.ts`, `src/lib/aboutUs.ts`, and `src/lib/merchantLanding.ts` have no explicit deadline. The root layout awaits homepage content on every route. The local run experienced slow navigations and cold-start timeouts; those timings also included compilation and test contention, so they are not production performance measurements. Add bounded fetching and measure an optimized production deployment separately.
5. **P3 — Metadata origin.** The production build warns that `metadataBase` is absent and resolves relative social image URLs using localhost. Configure the deployment's canonical origin before release.
6. **P3 — Customer-facing implementation language.** The account footer describes authentication tokens and `localStorage` in all three languages (`src/i18n/authCopy.ts`). Replace this with a concise privacy/security message appropriate for customers.

## Executed validation

| Check | Evidence / result |
| --- | --- |
| Whole-source TypeScript check | Passed; `npm run typecheck`. |
| Existing Node tests | **35 passed**, none skipped; `node --test tests/*.test.cjs`. |
| Production compilation | Passed using `next build --webpack`, including TypeScript and generation of 65 pages. The earlier default Turbopack attempt was interrupted during concurrent test load; its success is not claimed. |
| Existing critical browser suite | **39/40 passed initially**. The one voucher-pagination timeout passed on a focused rerun. Retained as a test-stability finding, not silently counted as an initial pass. |
| New browser regressions | **3/3 passed**: coupon card boundaries, timeout recovery, and failed-image fallbacks including pre-hydration failures. |
| Public/account responsive audit | **17 routes × 4 widths = 68 captures**. No document-level horizontal overflow. Initial homepage image and FAQ-label findings were rechecked after fixes: **8 further captures**, with no broken images, unlabelled visible controls, or page overflow on those two routes. |
| Extended feature checks | **5 distinct checks pass on their final runs**: Dutch integration controls, points checkout without purchasing on view, notification uncertainty acknowledgement/review, support wallet retry, and mobile merchant cards/pagination. Initial run: 2 passed / 3 failed from outdated fixtures. After CSRF repairs: 2 of those 3 passed; the last merchant test passed after required KPI fields were supplied. See `extended-tests.log`, `extended-tests-final.log`, and `merchant-mobile-final.log`. |
| Full ESLint | Failed with **38 errors, 10 warnings**; see remaining issues above. |

The 40 critical browser tests cover admin reporting/date filters/deep links/refresh/degraded data/pagination; shopper profile/avatar/language/email/security/preferences/wallet states; directory search/filter/history/pagination/error recovery/image fallbacks/localization; and merchant analytics/date ranges/drill-down/error/empty states.

Public/account routes checked: `/`, `/webshops`, `/kortingscodes`, `/hoe-werkt-het`, `/over-ons`, `/faq`, `/voor-webshops`, `/voor-webshops/aanmelden`, `/account?mode=login`, `/account`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invitations/accept`, `/pagina/privacy`, `/pagina/algemene-voorwaarden`, and `/support`. Redirect destinations are captured in the audit JSON; a redirect does not establish that an authenticated destination was reviewed.

Screenshots were captured automatically; representative homepage, coupon, merchant landing, and account screenshots were also inspected visually. The checks for accessible names, broken images, headings, and overflow are lightweight DOM checks, not an axe audit or assistive-technology certification.

## Evidence and rerunning

Evidence folder: `test-results/design-review/` (ignored generated output).

- `responsive.json` / `responsive.log`: complete public/account sweep before the final image/label corrections.
- `final/responsive.json` and `final/*.png`: homepage and FAQ confirmation after corrections.
- `browser-tests.log` and `pagination-recheck.log`: critical suite and focused retry.
- `fix-tests-final.log`: three new regressions, all passing.
- `unit-tests.log`, `lint.json`, `typecheck-final.log`, `changed-files-lint-final.log`, and `build-webpack.log`: source/tooling/build evidence.
- `extended-tests.log` and `extended-tests-final.log`: additional feature checks and fixture repairs.
- `merchant-mobile-final.log`: final passing merchant mobile check; its screenshot is in `test-results/design-merchant-mobile-final/`.

From the frontend directory, with isolated acceptance services already running, PowerShell:

```powershell
$env:BASE_URL = 'http://localhost:3038'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/frontend-design-audit.cjs
npx playwright test e2e/frontend-design-review.spec.ts --workers=1
```

The audit script accepts optional route arguments and `DESIGN_AUDIT_OUTPUT` for focused reruns. The installed Chrome was used because the browser revision expected by the current Playwright package was absent.

## Coverage limits

This is a broad frontend audit, not an assertion that every frontend issue has been found. Every route module was compiled, but not every authenticated route, CMS authoring workflow, banner editor, onboarding path, voucher redemption, team action, or real checkout was exercised. Real external integrations and live notifications were not verified. Firefox, Safari/WebKit, physical devices, screen readers, a complete keyboard audit, and production performance remain untested. No production credentials, deployment, or real payment was used.
