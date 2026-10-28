import { defineConfig, devices } from '@playwright/test';

/**
 * Separate config for the sample web / API / database tests under ./samples.
 * These are self-contained demos and intentionally do not use the pipeline
 * project's globalSetup/globalTeardown (which require Docker).
 */
export default defineConfig({
  testDir: './samples',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-samples', open: 'never' }]],
  projects: [
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: {
        baseURL: 'https://jsonplaceholder.typicode.com',
      },
    },
    {
      name: 'database',
      testMatch: /database\.spec\.ts/,
    },
    {
      name: 'web',
      testMatch: /web\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
