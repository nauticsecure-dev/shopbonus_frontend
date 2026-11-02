# About Us inline CMS — 2026-10-31

Implemented the review follow-up without publishing application content or changing existing company records.

- Publication saves first and stops on validation or revision conflict. The saved revision is passed to Publish to reject concurrent edits made after that save.
- Public failures/malformed responses return a neutral unavailable state. Missing published fields use empty structural values rather than marketing defaults. Unavailable metadata is neutral and noindex.
- NL/EN server rendering and metadata use the locale cookie; client language changes load that locale's publication. Draft state is isolated by locale.
- Draft loading occurs on entering edit mode. Preview and back preserve unsaved edits. Cancel uses the published snapshot, including after a successful draft save. Losing administrator access displays the public snapshot.
- Settings expose navigation, CTA destinations, value icons, team profiles, company details, section order/visibility, SEO/Open Graph images, and scheduling.
- Images support local file replacement, crop ratio/focal position, desktop/mobile uploads, alt text, and explicit assignment to draft. SEO and profile image slots use the same upload flow. Display URLs are omitted from saves.
- Historical versions are selected explicitly, compared with the current draft, and confirmed before immediate restoration. Backend rejects cross-locale restoration.
- Stock-photo fallbacks were removed. Configured profile photographs render. Hidden profile records are retained when loading drafts.
- Public frontend requests and the About Us API bypass caches. Successful publication/restoration fetch the public snapshot and refresh server metadata immediately.

Verification uses `playwright.about-cms.config.ts` with isolated fixture/API ports and webpack to avoid the machine's Turbopack memory failure. Browser API responses are controlled contracts, not production-service acceptance. Backend storage, authorization, visibility-window, revision and scheduler behavior are covered separately by Laravel tests. Five real HTTP examples from a temporary SQLite fixture are recorded in the sibling backend `docs/api/ABOUT_HTTP_CAPTURE.json`.

Executed verification: TypeScript and targeted ESLint passed. Playwright completed with 11 passed (webpack; Windows test-server teardown required stopping the isolated server process). Backend AboutUsCmsTest + OpenApiCoverageTest passed: 17 tests, 5207 assertions. Targeted Pint passed. An earlier Turbopack run exhausted machine memory and is superseded by the webpack run.

Release evidence still needed: authentic approved company/team photography and verified profile/company records, visual acceptance against the approved design, and deployment scheduler execution against real services. No approved photography was supplied; no founders, staff, registrations or company facts were invented.
