import "dotenv/config";
import { defineConfig } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_AUTH: "1",
      AUTH_URL: baseURL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production",
    },
  },
});
