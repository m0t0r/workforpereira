import { fileURLToPath } from "node:url";

/**
 * The half of `@repo/db/testing` a **Vitest config** reaches for, exported separately as
 * `@repo/db/testing/config` — and this file imports nothing but `node:url`, which is the whole
 * point of it.
 *
 * A consuming package's `vitest.config.ts` is loaded by Vite, which **externalises** a workspace
 * import rather than bundling it: `@repo/db/testing` is then resolved by *Node*, not by a bundler,
 * and the extensionless relative imports every JIT package uses (ADR-0006, `moduleResolution:
 * Bundler`) do not resolve there. Importing the harness index from a config therefore dies with
 * `ERR_MODULE_NOT_FOUND` before a single test runs. A file with no relative imports has nothing to
 * resolve, so it loads either way.
 *
 * `./index.ts` is the other half — `withRollback`, imported from inside test files, which Vite
 * transforms and where bundler resolution applies as normal.
 */

/**
 * `packages/db/migrations`, resolved from this module rather than from `process.cwd()`.
 *
 * A consuming package runs Vitest with its own directory as the cwd, so a relative path would
 * resolve against `packages/offers` and find nothing. This package is JIT — the file on disk is
 * the file that runs — so walking up from `import.meta.url` is exact.
 */
export const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * What a package passes to Vitest's `globalSetup`. It replays the migrations into one PGlite per
 * run and dumps it; each worker restores that dump in about 120ms.
 */
export const globalSetupPath = fileURLToPath(new URL("./global-setup.ts", import.meta.url));
