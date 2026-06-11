import { defineConfig, devices } from '@playwright/test'

// Tests E2E du SaaS Data OS. Lancer via `npm run test:e2e` (orchestre serveur + bypass auth local).
// Le serveur (next dev sur :3100) est démarré par e2e/run-e2e.sh avec un harnais d'auth local
// (pass-through) ; le code committé reste en mode Clerk.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    headless: true,
    actionTimeout: 20_000,
    navigationTimeout: 90_000,
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
