# AI support settings review — 2026-11-04

Local changes on HassanDev base1939a6b, uncommitted. Advanced draft values are preserved; supported controls/options/bounds match the sibling backend's SupportPolicy. Fixed controls use explicit disabled props. Settings tabs, labels, options, instructions, notices, errors and monitoring labels use NL/EN/DE LocaleContext dictionaries. Monitoring shows current Reverb probe status, time and latency.

Executed: TypeScript, targeted ESLint and `node scripts/test-support-settings.cjs` PASS. The controlled rendered-component harness checks loaded/edited policy serialization, fixed controls, three locales and localized validation feedback; it is not browser/provider acceptance. Full browser journeys and production build NOT RUN.

Backend scoped tests21PASS/8032assertions; local actual Reverb3PASS; isolated actual HTTP4PASS. See sibling backend docs/SUPPORT_SETTINGS_CONNECTIVITY_REVIEW_2026-11-04.md for runbook/evidence. Deployment needs scheduler, shared cache, existing Reverb credentials and permitted probe origin. Probe establishes server-to-Reverb delivery, not browser/queue/provider availability. No package, migration, commit, push or deployment.
