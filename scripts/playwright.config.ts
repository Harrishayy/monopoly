import { defineConfig } from '@playwright/test';

/** Drives the 60-second video shot list against a running `pnpm demo`. */
export default defineConfig({
  testDir: '.',
  testMatch: 'demo-video.playwright.ts',
  timeout: 90_000,
  use: {
    baseURL: process.env.DEMO_URL || 'http://localhost:3100',
    viewport: { width: 1440, height: 900 },
    launchOptions: { slowMo: 450 },
  },
});
