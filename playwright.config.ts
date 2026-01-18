/**
 * Playwright Configuration for Frontend E2E Tests
 *
 * Uses a separate port (3334) to avoid conflicts with development server.
 * Tests manage state via API calls in the fixtures.
 */

import { defineConfig, devices } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3334;
const testConfigPath = join(__dirname, "test/fixtures/test-config.json5");

export default defineConfig({
  testDir: "./e2e-ui",
  fullyParallel: false, // Run tests sequentially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start server before running tests
  webServer: {
    command: `bun src/index.ts`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PORT: String(PORT),
      CONFIG_PATH: testConfigPath,
      NODE_ENV: "test",
    },
  },
});
