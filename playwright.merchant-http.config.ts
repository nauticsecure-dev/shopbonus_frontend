import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'merchant-landing-http.spec.ts',timeout:240000,workers:1,reporter:'list',outputDir:'test-results-merchant-http'});
