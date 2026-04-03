import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// โหลด .env.test
import * as fs from 'fs';
const envFile = path.resolve(__dirname, '.env.test');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5500';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  /* เปิด local HTTP server อัตโนมัติก่อนรัน test */
  webServer: {
    command: 'npx http-server . -p 5500 -c-1 --cors -s',
    port: 5500,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },

  projects: [
    /* === Auth Setup (รันก่อน) === */
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },

    /* === Integration Tests (API endpoint) === */
    {
      name: 'integration',
      testDir: './tests/integration',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
    },

    /* === E2E Tests (Browser UI) === */
    {
      name: 'e2e',
      testDir: './tests/e2e',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
    },
  ],
});
