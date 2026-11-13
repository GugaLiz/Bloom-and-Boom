import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 390, height: 844 }, browserName: 'chromium', channel: process.env.PW_CHANNEL || undefined, screenshot: 'only-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 0.0.0.0', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
