import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3100";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // `pnpm start -- -p ${PORT}` was found to break on this pnpm
        // version (10.30): pnpm forwards the literal `--` token into the
        // underlying `next start` invocation instead of stripping it as a
        // passthrough delimiter, so Next's CLI parser sees `-- -p 3100` and
        // treats `-p` as a positional project-directory argument rather
        // than a flag ("Invalid project directory provided, no such
        // directory: .../-p"). Invoking `next start` directly sidesteps
        // the pnpm-script indirection entirely.
        command: `pnpm build && npx next start -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
