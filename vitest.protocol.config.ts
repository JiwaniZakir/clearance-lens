import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Separate from vitest.config.ts (the unit suite) because this one needs a
// REAL running server (local, preview, or production) to connect to — it's
// never run as part of the default `pnpm test`. See tests/protocol/mcp-conformance.test.ts.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/protocol/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
