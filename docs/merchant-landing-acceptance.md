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
