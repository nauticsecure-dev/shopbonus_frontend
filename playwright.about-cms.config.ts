import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: ['about-inline-cms.spec.ts', 'over-ons.spec.ts'], timeout: 60000, outputDir: 'test-results-about-cms',
  fullyParallel: false, workers: 1, reporter: [['list']],
  expect: { timeout: 20000 },
  use: { baseURL: 'http://localhost:3313', ...devices['Desktop Chrome'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined },
  webServer: [
    { command: 'node scripts/about-cms-fixture.cjs', url: 'http://127.0.0.1:8313', reuseExistingServer: false },
    { command: 'npx next dev --port 3313', url: 'http://localhost:3313/over-ons', timeout: 180000, reuseExistingServer: false, stdout: 'pipe', stderr: 'pipe', env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8313', SHOPBONUS_NEXT_DIST_DIR: '.next-about-cms' } },
  ],
});
