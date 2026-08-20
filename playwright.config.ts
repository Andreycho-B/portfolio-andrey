import { defineConfig, devices } from '@playwright/test'

// Suite e2e contra el build SSG real: generate + preview en localhost:3000.
// Sin CI (decisión del autor): se corre localmente con `pnpm test:e2e`.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm generate && pnpm preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})