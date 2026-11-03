import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'merchant-inline-cms.spec.ts', timeout: 90000,
  outputDir: './test-results-merchant-cms', expect: { timeout: 20000 },
  fullyParallel: false, workers: 1, reporter: [['list']],
  use: { baseURL: 'http://localhost:3012', ...devices['Desktop Chrome'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined },
  webServer: [
    { command: 'node scripts/merchant-cms-fixture.cjs', url: 'http://127.0.0.1:8012', reuseExistingServer: true },
    { command: 'npx next dev --port 3012', url: 'http://localhost:3012', timeout: 180000, reuseExistingServer: true, env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8012', SHOPBONUS_NEXT_DIST_DIR: '.next-merchant-cms', NEXT_PUBLIC_USE_COOKIE_AUTH: 'false' } },
  ],
});



