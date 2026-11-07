# Quality Center

Open `/quality-center` from the Super Admin cockpit or by URL. Super Admin and QA Tester accounts can browse the inventory, staging results, evidence, findings, schedules and OpenAPI reference. Developers see their assigned findings. Laravel applies role, account and session checks to each request. The API reference renders the protected OpenAPI response in the frontend and displays operation metadata and examples. Staging imports use the existing password confirmation flow.

## Frontend inventory

Run `node scripts/qa-discover.cjs` from this repository to print a candidate inventory from committed Git blobs. It inspects Next app route files, JSX handlers and server-action directives, component declarations and uses, and likely UI states. Worktree edits and untracked files are outside the scanned revision.

Review the candidate list against deployed browser journeys. Create a JSON review with the same `git_sha` and four arrays named `routes`, `actions`, `components` and `ui_states`. Each review entry has an `id`, a `decision` of `covered` or `excluded`, and a `reference` to the evidence or exclusion rationale. Add separately discovered runtime paths to the review with their evidence references. Run `node scripts/qa-discover.cjs --verify reviewed-inventory.json` to check the exact revision, uniqueness and candidate dispositions. The resulting inventory lists covered IDs. The command checks reconciliation of static candidates. Runtime completeness and the referenced evidence still require independent review.
