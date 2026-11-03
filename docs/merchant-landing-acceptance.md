## Review follow-up — 2026-11-03

Revision comparison is implemented. The history tab requests include_content=1 and displays changed fields side by side against the current draft, including added/removed values, array order, media IDs, visibility and schedules. Connector availability is derived rather than historical and is excluded. Restore stays disabled when selected revision content is unavailable; selecting a publication does not change the draft or public page.

The inline CMS now localizes toolbar actions, structured field/section labels, collection templates, media controls/crop instructions, scheduling, history/comparison, AI approval actions and status/error messages for NL/EN/DE. Backend validation/conflict/session failures are mapped to localized UI messages instead of displaying English API text.

Executed checks: focused Laravel suite **14 passed / 81 assertions** ([output](../../shopbonus_backend/docs/merchant-cms-focused-tests.json)); comparison/localization unit tests **2 passed**; full frontend TypeScript check passed; targeted ESLint passed. Targeted Pint passed. No production build or deployment. Changes are uncommitted; frontend HassanDev bd76ff4, backend HassanDev b92f46a. Existing unrelated changes were preserved.

**Real-service HTTP journey passed: 1 test, 2.8 minutes.** Real Laravel server, isolated SQLite, filesystem storage, genuine cookie login/CSRF/TOTP MFA and recent-password confirmation, no intercepted API responses. Verified draft/public isolation, real PNG upload (201) and retrieval (200), publish, immutable history content, exact-version restore, revision-pinned schedule creation (201), unchanged public content before due time, and publication after the actual due time using shopbonus:publish-scheduled-content. Security probes returned 403 for missing MFA, 401 before challenge completion, 423 before password confirmation and 419 without CSRF. [HTTP evidence](merchant-landing/real-http-results.json), [captured version response](../../shopbonus_backend/docs/api/MERCHANT_HISTORY_HTTP_CAPTURE.json). An oversized test image was replaced after an expected 422. A separate interrupted run returned 500 on a later save without a recorded application error; the final full rerun passed unchanged application code.

**Acceptance remains PARTIAL.** The updated controlled browser suite and new real-service browser suite could not complete: Windows exhausted memory/paging space while starting Next, including a sequential retry with a 768 MB Node heap cap. These are not browser passes. Complete authenticated conversion/onboarding, provider connections, and the edit/save/publish/restore/upload/schedule browser journey still need staging or a machine with sufficient memory. The HTTP result proves the backend journey only.

**Reference fidelity remains unverified.** Repository images include prior implementation screenshots and references for other pages; none is established as the original merchant-landing design image. The original file path/link has been requested. No pixel-fidelity claim is made.

Reproduce locally: from backend, php scripts/merchant-review.php serve for a new isolated database, or resume for its existing database. From frontend, npx playwright test --config playwright.merchant-http.config.ts. The browser suite uses playwright.merchant-live.config.ts and expects the initial synthetic publication; start with a fresh isolated database for that suite. Provider, mail, AI and production-service verification are excluded.

---

# Merchant landing and inline CMS acceptance

Local changes remain uncommitted. Existing work in both repositories was preserved.

The editor now separates published and saved draft snapshots, serializes saves and publication, autosaves after 1.5 seconds, preserves Preview changes, blocks failed saves, and publishes only the exact saved revision. Language switching reloads the approved translation and server metadata using the locale cookie. Public fetch failures no longer substitute marketing defaults.

Page settings expose structured content/FAQ/navigation/footer editing, collection ordering, benefit/step icons, section drag/drop and visibility, media library selection/uploads/cropping/responsive variants, schedules and a version picker. Main images use CMS media slots and illustrative fallbacks. Platform selection survives onboarding and opens the selected live catalogue entry.

Queued publication uses the existing revision-pinned scheduler. Visibility windows can also be published immediately. Pending schedule cancellation remains in Content Studio. Deployment must run the existing scheduled-content command.

Browser tests use controlled API responses and a dedicated Next server with its own build directory; they are contract regressions, not real-service E2E evidence. Laravel tests independently cover authorization, stored drafts/publications, responsive media validation, unsafe links, conflicts and time boundaries. API examples were captured from an actual local HTTP server with an isolated synthetic fixture.

Validation results are below. No deployment, production build, full backend suite or real-provider acceptance was performed.

Backend verification: 36 focused tests passed, 5,358 assertions on SQLite; targeted PHPStan has zero errors; targeted Pint passed. The stale onboarding expectation was corrected because NL is already the model default and requires KvK.

Full frontend typecheck is affected by concurrent edits outside this task. Latest run reports nullability/signature errors in src/app/over-ons/page.tsx and src/lib/aboutUs.ts, plus a DiscoveryWebshopDetail access error in src/components/PopularWebshops.tsx. Earlier support errors disappeared during the session. These files were left untouched.

Browser evidence: all 13 merchant CMS/onboarding browser contract cases have passing executions across focused runs, using installed Chrome. A 12-case consolidated run passed 11 and hit the original 5-second English-metadata wait; after setting the isolated suite expectation to 20 seconds, the English metadata and layout rerun passed both cases. The separate integration-selection case passed. Other covered cases: 422/409 publication blocking, Cancel draft isolation, Preview/autosave, exact revision restoration, section visibility/order, media selection and crop upload, FAQ/footer/icon editing, visibility windows and queued revision-pinned publication. No real-service E2E claim is made.

Targeted ESLint: passed. Full typecheck remains blocked by unrelated concurrent About Us/discovery changes described above. Screenshots use synthetic approved publication content: [desktop](merchant-landing/desktop.png), [mobile](merchant-landing/mobile.png). Both were visually reviewed. Main layout fits 390px and desktop widths.

Final navigation-protection regression passed: clicking a different page while dirty waits for a successful draft save; a failed save keeps the editor open. This brings the focused browser contract cases with passing executions to 14. Final targeted ESLint passed. Hero fallback stock photos were replaced by vector artwork and its illustrative note is visible. The isolated server and temporary HTTP capture fixture have been stopped/removed; generated merchant test-directory additions were removed from the shared TypeScript configuration.

Latest full typecheck attempt was interrupted by missing generated .next-about-cms/dev/types files from concurrent About Us test cleanup (TS6053); this does not establish a clean repository-wide typecheck. The task-specific ESLint checks pass. No unrelated source or generated About Us configuration was changed.
