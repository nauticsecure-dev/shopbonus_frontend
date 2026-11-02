# Multilingual CMS review repairs — 2026-11-02

Implemented on the existing CMS, FAQ, consent, revision and localization systems. Both repositories remain on HassanDev (frontend base 3d0b0ad, backend base 59916e9), with pre-existing unrelated edits preserved. No migration, new dependency, commit or deployment.

- RichTextEditor edits the existing allowed document tree directly: paragraphs, headings, nested bullet/numbered lists, marked text, links, uploaded asset IDs/alt text and buttons. Editing one text node retains its marks and every untouched sibling. Explicit controls add/remove/reorder nodes; server allowlist validation remains authoritative.
- Manual publication requires revision from the reviewed draft. Preview returns draft_revision with its snapshot; inline and admin publishers send it. The backend checks it under the existing row lock and returns 409 draft_changed without publishing a newer draft. Missing revision is 422. Inline legal publication now accepts version/date and preserves existing approval checks; unsaved inline changes disable Publish.
- Homepage already had locale-aware metadata and live content refresh in the existing working tree. Kept those changes, handled a failed refresh, and shared requestLocale across homepage and merchant landing metadata/content using cookie or Accept-Language. Server content fetchers already use no-store.
- Public CMS language switching follows published alternate slugs. A hydration-time 404 also resolves the slug in the other language before reporting a missing page. Inline editor state is remounted for a different translated page.
- Automatic stored locale no longer overrides an account preference. Only an explicit selection sets shopbonus-locale-explicit. Legacy unmarked values are treated as automatic because their provenance cannot be recovered.
- Localized dashboard navigation/account/workspace chrome, notification-management tabs/messages/statuses/policy controls and checkout states/actions through stable interface dictionary keys. Stored CMS/template content and backend protocol identifiers retain their existing source. This is a correction of the identified screens, not evidence of an exhaustive all-role screen audit.
- Mutable public CMS pages/index, FAQ and cookie policy use no-store. Frontend CMS/consent fetches explicitly bypass caching; existing Laravel versioned caching remains. New requests see the latest publication; already open pages do not receive a publication push.
- Optional tracker integrations can register enable/disable lifecycle hooks and controlled cookie/storage prefixes. Permission state changes before consent events. Revocation shuts down controlled timers/listeners and clears controlled cookies (including host/parent-domain and path scopes), localStorage and sessionStorage. A running script without a shutdown hook forces document replacement after revocation. Registered scripts remain loaded and restart through their lifecycle, avoiding duplicate SDK initialization after re-consent. Cookies controlled only by a third-party domain or HttpOnly server cookies require provider/server cleanup; the loader cannot directly delete them.

Validation executed:

- node --test tests/cms-review.test.cjs: six PASS (structure preservation, running tracker shutdown/storage, unknown-SDK document replacement, account locale precedence, alternate slug navigation, localized homepage/merchant metadata).
- Chrome Playwright e2e/consent-withdrawal.spec.ts: two PASS, including two opt-in/withdraw cycles, running interval/listener shutdown, cookie/storage deletion and preservation of essential cookies. Also verifies actual document replacement for a loaded unmanaged SDK. Uses controlled tracker fixtures.
- npm run typecheck: PASS.
- Targeted ESLint: PASS.
- Backend CMS/scheduling/consent: 20 PASS, 278 assertions.
- Backend OpenAPI coverage: three PASS, 5,123 assertions.
- Targeted Pint: PASS.
- Nine real local HTTP captures from an isolated SQLite fixture and synthetic signed-in session: backend docs/api/CMS_REVIEW_HTTP_CAPTURE.json. Captures cover preview, missing revision, edit after review, stale publication, current publication, public page, FAQ and policy. Temporary database, session fixture and server cleaned up.

Full authenticated application browser journeys and real configured tracker/provider acceptance remain unverified. Backend and frontend must be released together: manual publication consumers now need revision. No production rollout performed.

Final combined backend validation: 23 tests PASS / 5,401 assertions. Two Chrome consent lifecycle regressions PASS, six frontend regressions PASS; TypeScript, targeted ESLint and diff whitespace checks PASS. Full authenticated application journeys and actual external providers remain unverified.
