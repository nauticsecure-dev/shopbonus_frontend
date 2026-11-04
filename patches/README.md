# ESLint plugin compatibility patches

These patches retain the Next.js flat config's React, import and accessibility rule coverage while using ESLint 10 and patched minimatch 11. They are local adaptations of the original plugins, not upstream releases.

- React and accessibility consumers import the named `minimatch` function.
- Import consumers use that function too. The internal-module rule builds `Minimatch` instances and calls `match()` because minimatch 11 removed regex generation via `makeRe()`.
- Next.js 16.4.4 supplies the ESLint 10 rule-context compatibility layer for the React and import plugins. The manifest's ESLint override prevents their older peer declarations from reinstalling ESLint 9.

Normal `npm install` / `npm ci` runs the checked-in postinstall script with `patch-package --error-on-fail`. If development dependencies were installed with `--ignore-scripts`, run `npm run postinstall` before linting. Production-only installs skip patching when ESLint is absent.

All three plugin versions are pinned in `package.json` overrides because patches are version-specific. When updating one, review its upstream minimatch and ESLint support, regenerate or remove its patch, then run `npm run test:lint-tooling`, `npm run lint`, `npm run typecheck`, and both npm audits. Keep the minimatch security override until the entire tree resolves patched releases. Verify a clean install as well as the existing installation.
