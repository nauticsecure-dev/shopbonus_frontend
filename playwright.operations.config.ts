import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", testMatch: "admin-operations.spec.ts", workers: 1,
  timeout: 90000, reporter: "list", outputDir: "test-results/operations",
  use: { baseURL: process.env.BASE_URL || "http://localhost:3000", ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
});
