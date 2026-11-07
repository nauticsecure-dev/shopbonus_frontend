import { defineConfig } from '@playwright/test';
import base from './playwright.merchant-cms.config';
export default defineConfig({ ...base, testMatch: 'quality-execution.spec.ts', outputDir: './test-results-quality-center' });
