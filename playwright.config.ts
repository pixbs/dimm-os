import { defineConfig, devices } from '@playwright/test'

// The login reads the first admin from .env, as the server does.
import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  // The light-theme test takes minutes, so ci runs it on main only.
  testIgnore: process.env.GITHUB_EVENT_NAME === 'pull_request' ? ['**/light.e2e.spec.ts'] : [],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    // CI tests the production build.
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:3000',
  },
})
