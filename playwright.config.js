import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:8787',
  },
  webServer: {
    command: 'python3 -m http.server 8787 --bind 127.0.0.1',
    port: 8787,
    reuseExistingServer: true,
  },
});
