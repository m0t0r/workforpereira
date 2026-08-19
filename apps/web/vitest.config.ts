import { globalSetupPath } from "@repo/db/testing/config";
import { defineConfig } from "vitest/config";

/**
 * ADR-0017's **primary** seam: `src/use-cases/`, and nothing else in this app.
 *
 * The `include` glob is deliberately narrow rather than `src/**` — React components, Server Action
 * adapters and async Server Components are the three things ADR-0017 explicitly does not test, and a
 * wider glob would make adding one of those tests look like an oversight rather than a decision.
 * `app/` is excluded by construction: everything there imports `next/*`.
 *
 * `@repo/db/testing/config`, not `@repo/db/testing` — Vite *externalises* a workspace import in a
 * config file, so Node resolves it rather than a bundler, and the extensionless relative imports
 * every JIT package uses do not resolve there.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/use-cases/**/*.test.ts"],
    globalSetup: [globalSetupPath],
  },
});
