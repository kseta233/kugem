import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const tryReadEnvFile = (filePath: string): string | null => {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const line = raw
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('E2E_BASE_URL='))

  if (!line) {
    return null
  }

  const [, value] = line.split('=', 2)
  return value?.trim() || null
}

const fileEnvUrl =
  tryReadEnvFile(path.resolve(__dirname, '.env.e2e')) ??
  tryReadEnvFile(path.resolve(__dirname, 'apps/web/.env.e2e'))

const rawBaseUrl = process.env.E2E_BASE_URL ?? fileEnvUrl

const e2eBaseUrl = rawBaseUrl
  ? rawBaseUrl.startsWith('http://') || rawBaseUrl.startsWith('https://')
    ? rawBaseUrl
    : `https://${rawBaseUrl}`
  : null

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
