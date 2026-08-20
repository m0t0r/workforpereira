import { globalSetupPath } from "@repo/db/testing/config";
import { defineConfig } from "vitest/config";

/**
 * ADR-0017: one config per package, so each package's test result caches independently.
 *
 * `@repo/db/testing/config` rather than `@repo/db/testing` — Vite *externalises* a workspace import
 * in a config file, Node resolves it, and the extensionless relative imports of a JIT package do
 * not resolve there. The `config` entry point imports nothing but `node:url` for that reason.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: [globalSetupPath],
  },
});
