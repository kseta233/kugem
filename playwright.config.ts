import { defineConfig, devices } from '@playwright/test'

const e2eBaseUrl = process.env.E2E_BASE_URL

if (!e2eBaseUrl) {
  throw new Error('Missing E2E_BASE_URL environment variable for Playwright target URL.')
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium-pixel5',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
})
