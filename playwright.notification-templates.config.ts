import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: "notification-templates.spec.ts", workers: 1,
  timeout: 60000, reporter: [["list"]], outputDir: "test-results/notification-templates",
  use: { baseURL: "http://localhost:3327", ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined },
  webServer: { command: "npx next dev --webpack --port 3327", url: "http://localhost:3327/login",
    timeout: 180000, reuseExistingServer: false,
    env: { SHOPBONUS_NEXT_DIST_DIR: ".next-notification-templates" } },
});
