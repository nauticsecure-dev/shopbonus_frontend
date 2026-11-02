import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["merchant-analytics.spec.ts", "retired-financial-apis.spec.ts"],
  workers: 1,
  timeout: 60000,
  reporter: [["list"]],
  outputDir: "test-results/launch-acceptance",
  use: {
    baseURL: "http://localhost:3331",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
});
