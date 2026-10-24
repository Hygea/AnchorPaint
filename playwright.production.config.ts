import { defineConfig } from '@playwright/test';

// Exercise the built files at the case-sensitive GitHub Pages project path.
// The relative build also works at / locally; --base mounts preview at this path.
export default defineConfig({
  testDir: './tests/production',
  use: {
    baseURL: 'http://127.0.0.1:4174/AnchorPaint/',
    viewport: { width: 1440, height: 1000 },
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --base /AnchorPaint/ --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/AnchorPaint/',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
