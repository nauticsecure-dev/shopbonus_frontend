import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', outputDir: '.next-homepage-cms/qa-results', testMatch: 'homepage-cms-regressions.spec.ts', timeout: 90000,
  fullyParallel: false, workers: 1, reporter: [['list']],
  use: { baseURL: 'http://localhost:3013', ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined },
  webServer: [
    { command: 'node scripts/homepage-cms-fixture.cjs', url: 'http://127.0.0.1:8013', reuseExistingServer: true },
    { command: 'npx next dev --port 3013', url: 'http://localhost:3013', timeout: 180000, reuseExistingServer: true, env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8013', SHOPBONUS_NEXT_DIST_DIR: '.next-homepage-cms' } },
  ],
});


