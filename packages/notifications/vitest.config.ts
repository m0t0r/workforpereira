import { globalSetupPath } from "@repo/db/testing/config";
import { defineConfig } from "vitest/config";

/**
 * ADR-0017: one config per package, registered as a turbo `test` task, so each package's result
 * caches independently. `globals: true` — which is why `tsconfig.json` names
 * `["vitest/globals", "node"]`. `environment: "node"` everywhere; there is no jsdom in this repo.
 *
 * **`@repo/db/testing/config`, not `@repo/db/testing`.** Vite *externalises* a workspace import in
 * a config file, so Node resolves it rather than a bundler, and the extensionless relative imports
 * every JIT package uses do not resolve there. `…/testing/config` imports nothing but `node:url`
 * for exactly that reason.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // One migrated PGlite per run, dumped to a tarball; each worker restores it in ~120ms.
    globalSetup: [globalSetupPath],
  },
});
