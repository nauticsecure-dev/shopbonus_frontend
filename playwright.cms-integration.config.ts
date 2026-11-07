import { defineConfig } from '@playwright/test';
import base from './playwright.merchant-cms.config';
export default defineConfig({ ...base, testMatch: 'cms-integrations.spec.ts', outputDir: './test-results-cms-integrations' });
