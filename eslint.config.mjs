import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Next 16.4 provides the rule-context compatibility layer for ESLint 10.
  ...nextCoreWebVitals,
  globalIgnores([
    ".next*/**",
    ".consumer-acceptance/**",
    "out/**",
    "build/**",
    "playwright-report/**",
    "test-results*/**",
    "live-test-results/**",
    "next-env.d.ts",
  ]),
  {
    // Demo fixture images use remote URLs; next/image domains are not configured for them.
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
