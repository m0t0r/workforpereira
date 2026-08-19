import { defineConfig } from "vitest/config";

/**
 * ADR-0017: one config per package, registered as a turbo `test` task, so each package's result
 * caches independently. `globals: true` — which is why `tsconfig.json` names
 * `["vitest/globals", "node"]`. `environment: "node"` everywhere; there is no jsdom in this repo.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // One migrated PGlite per run, dumped to a tarball (ADR-0017: replaying the migrations is the
    // only way the test database is built, and it costs ~1s).
    globalSetup: ["./src/testing/global-setup.ts"],
  },
});
