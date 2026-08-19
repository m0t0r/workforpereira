import { defineConfig } from "vitest/config";

/**
 * The **coverage** configuration, and nothing else. ADR-0017 puts one `vitest.config.ts` in each
 * package and registers `test` as a turbo task, so that each package's result caches
 * independently — a single root configuration would grow one cache key across every package and
 * re-run everything on every change. This file is the exception the report needs: `turbo run test`
 * produces N summaries, and the pull-request comment wants one.
 *
 * Coverage is **reported and never gated** (ADR-0017). The seams are restricted by decision and
 * the unit/integration split is a property of the signature, so the number can only be raised by
 * testing things this repo has decided not to test. It is a trend to look at, not a bar to clear.
 */
export default defineConfig({
  test: {
    // Config files rather than directories, so a package with no tests yet is skipped instead of
    // being treated as a project with default settings.
    projects: ["packages/*/vitest.config.ts", "apps/*/vitest.config.ts"],
    coverage: {
      provider: "v8",
      // `json-summary` is what the pull-request comment action reads; `json` gives it per-file
      // detail. No external coverage service — ADR-0017 declines one explicitly.
      reporter: ["text", "json-summary", "json"],
      reportsDirectory: "./coverage",
    },
  },
});
