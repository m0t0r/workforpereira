import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { config } from "dotenv";
import { expand } from "dotenv-expand";

/**
 * Walks up from `process.cwd()` looking for the workspace root — the directory holding
 * `pnpm-workspace.yaml` — and returns the path to its `.env`, or `undefined` if there is no
 * workspace above us.
 *
 * Walking beats a path relative to this file. drizzle-kit bundles `drizzle.config.ts` to CJS with
 * esbuild before evaluating it, and `import.meta.dirname` is `undefined` in that bundle, so
 * anything anchored to this module's own location breaks under the CLI. `cwd` differs between the
 * two callers — `packages/db` for drizzle-kit, `apps/web` for the running app — but the workspace
 * root is above both.
 */
function findWorkspaceEnv(): string | undefined {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return resolve(dir, ".env");
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Reads `DATABASE_URL`, loading the repo-root `.env` first if there is one.
 *
 * One `.env`, at the root, is the single source for local configuration — Docker Compose reads it
 * natively and this reads it explicitly, so the connection string is written once and cannot drift
 * between the container and its clients.
 *
 * In production there is no `.env` and no workspace root: the lookup misses, nothing is loaded,
 * and the value comes from the process environment (Fly secrets, ADR-0005). `dotenv` never
 * overrides an existing variable, so an explicit `DATABASE_URL=… pnpm db:migrate` against another
 * environment also wins over the file.
 */
export function databaseUrl(): string {
  const path = findWorkspaceEnv();
  if (path) {
    // `expand` resolves `${POSTGRES_PORT}` inside DATABASE_URL. Plain dotenv does not interpolate,
    // where Compose does — so without this the same `.env` would mean two different things to the
    // container and to its clients.
    expand(config({ path, quiet: true }));
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env at the repo root, or export it.",
    );
  }
  return url;
}
