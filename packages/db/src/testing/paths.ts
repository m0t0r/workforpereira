import { fileURLToPath } from "node:url";

/**
 * `packages/db/migrations`, resolved from this module rather than from `process.cwd()`.
 *
 * A consuming package runs Vitest with its own directory as the cwd, so a relative path would
 * resolve against `packages/offers` and find nothing. This package is JIT (ADR-0006) — the file
 * on disk is the file Vitest loads — so walking up from `import.meta.url` is exact.
 */
export const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));

/** `packages/db/src/testing/global-setup.ts`, for a consuming package's `vitest.config.ts`. */
export const globalSetupPath = fileURLToPath(new URL("./global-setup.ts", import.meta.url));
