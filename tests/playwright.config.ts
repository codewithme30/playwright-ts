import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 3600_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  workers: 1
  
});