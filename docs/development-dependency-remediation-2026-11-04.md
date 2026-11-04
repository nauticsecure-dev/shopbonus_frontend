# Development dependency remediation — 2026-11-04

Status: remediated. The full and production-only npm audits now both report **zero vulnerabilities**, following the ESLint 10 migration described below. The initial audit had 22 moderate findings; the first scoped fixes reduced that to 15.

Evidence: [full audit](development-dependency-audit-2026-11-04.json), [production audit](development-dependency-audit-production-2026-11-04.json).

## Completed ESLint migration

- Upgrade ESLint from `9.39.4` to `10.14.0`, retain the Next.js `16.4.4` flat config and all its existing enabled rules, and require Node `^20.19.0 || ^22.13.0 || >=24`. See the [official ESLint migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0). Next 16.4.4 already ships a rule-context compatibility layer for ESLint 10.
- Override every minimatch resolution to `11.0.4`. The former ESLint 9 legacy config dependency tree is removed. An `eslint: "$eslint"` override keeps plugins on the direct ESLint 10 installation instead of introducing ESLint 9 through their older peer ranges.
- Preserve the existing React, accessibility and import plugins with three checked-in, version-specific patches. They use the named minimatch function; `import/no-internal-modules` uses `Minimatch.match()` instead of the removed `makeRe()` API. No lint rules were disabled for the migration.
- Apply patches through `scripts/apply-eslint-patches.cjs` during `postinstall`, using pinned `patch-package@8.0.1` with `--error-on-fail`. Production installs that omit lint tooling skip this step. See [patch maintenance instructions](../patches/README.md).
- Ignore generated `.next*` previews and browser reports so `npm run lint` checks source and configuration rather than generated bundles.

## Migration verification

- Full `npm audit --json`: **0 vulnerabilities**. `npm audit --omit=dev --json`: **0 vulnerabilities**. Both saved reports above were refreshed after migration.
- `npm ls eslint minimatch`: a valid dependency tree with one ESLint version (`10.14.0`) and only patched minimatch `11.0.4`; no ESLint 9 or minimatch 3 remains.
- `npm run typecheck`: passes.
- `npm run test:lint-tooling`: **8 tests pass**, exercising the enabled rule groups, React wildcard exceptions and custom components, accessibility label/control globs, import namespace and side-effect exceptions, internal import allow/forbid matching, development-dependency file globs, generated-output ignores, and the production-only postinstall path.
- Targeted ESLint on the config, both new tooling scripts, the database schema, voucher page and voucher helper passes.
- Full `npm run lint` completes with **38 errors and 10 warnings**. For all 253 files checked before migration, diagnostics are identical: 32 errors and 10 warnings. The other six errors are `@next/next/no-assign-module-variable` findings in existing `tests/*.cjs` files outside that earlier source-only scan. The lint command therefore still exits 1; this migration does not claim a clean application lint run. No application source was changed or rule weakened to hide those findings.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: passes lockfile consistency validation.
- A separate temporary installation of the manifest, lockfile, config, patches and tooling scripts passes `npm ci --ignore-scripts --no-audit --no-fund`, explicit `npm run postinstall`, and all seven plugin/config tests copied into that fixture. This verifies patch application from pristine packages without replacing the working installation. Third-party lifecycle scripts were skipped. The eighth production-only hook test also passes in the working installation.

Machine-readable [lint comparison and verification summary](eslint-tooling-verification-2026-11-04.json) records the unchanged baseline diagnostics and the six additional findings from the broader test-file scan.

The patches are temporary compatibility maintenance until upstream plugin releases support the patched minimatch API. Upgrade the pinned plugins and their patches together and rerun the tooling tests; do not remove the security override or skip patch application during development installs.

## Initial partial remediation (historical)

The sections below record the earlier reduction from 22 to 15 findings. Their residual finding is closed by the ESLint migration above.

### Initial changes

- Override esbuild only beneath `@esbuild-kit/core-utils` to `0.25.12`, the patched release already used by Drizzle Kit itself. This removes the legacy `0.18.20` executable and its platform packages from the lockfile. Other esbuild consumers retain their existing resolutions. The [esbuild advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99) identifies `>=0.25.0` as patched.
- Override minimatch only beneath `@typescript-eslint/typescript-estree` to `11.0.4`. That consumer uses the named `minimatch` function, which the updated package still exports. Its Node requirement is compatible with the pinned Next.js version's Node 20.9+ requirement; verification used Node 24.21.0.
- Keep application dependencies and direct tooling versions unchanged. Regenerate the affected lockfile resolutions.

### Initial remaining finding

The 15 remaining findings all trace to minimatch `3.1.5` in ESLint and its plugins. The [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) currently marks versions below `11.0.1` as affected. npm reports no automatic fix for the remaining tree. Registry inspection also found that current ESLint `10.14.0` still requests minimatch `^10.2.6`, so upgrading ESLint alone would not clear the advisory.

A global override to minimatch 11 is incompatible: `eslint-plugin-import`, `eslint-plugin-react`, and `eslint-plugin-jsx-a11y` call the CommonJS export directly as a function; minimatch 11 exports an object with a named function. The installed ESLint 9 config packages also import the old default export. This change deliberately retains those functional consumers. Closure requires upstream compatible fixes or a separately validated lint-toolchain migration. The full dependency remediation finding remains open.

### Initial verification

- `npm ls esbuild minimatch`: valid tree; Drizzle's legacy loader resolves esbuild `0.25.12`, the TypeScript parser resolves minimatch `11.0.4`, and no esbuild `0.18.20` remains in the lockfile.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: passes lockfile consistency checks. This was a dry run, not a clean reinstall.
- `npm run typecheck`: passes.
- ESLint on `eslint.config.mjs`, `src/db/schema.ts`, `src/app/dashboard/vouchers/page.tsx`, and `src/lib/merchantVouchers.ts`: passes.
- Broader ESLint on `src`, `e2e`, `scripts`, `eslint.config.mjs`, and `next.config.ts` completes with 32 source errors, including React effect-state rules. No source or rule configuration changes were made as part of this remediation.
- Direct legacy-loader synchronous and asynchronous TypeScript transformations execute correctly and return source maps. Parser minimatch named-export matching checks pass.
- `drizzle-kit --version` and `drizzle-kit generate --dialect postgresql --schema ./src/db/schema.ts --out <unique temporary directory>` pass. The schema is currently empty; no database connection or migration application was attempted. The generation check required execution outside the sandbox because Windows user lookup failed inside it.

No production build or browser acceptance was rerun for these development-only dependency overrides.
