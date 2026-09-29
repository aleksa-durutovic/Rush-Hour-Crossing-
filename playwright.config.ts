import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:4173/api/health',
    env: { PORT: '4173' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
