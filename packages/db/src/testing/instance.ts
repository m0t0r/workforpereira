import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";

import type { Db } from "../client";
import * as schema from "../schema/index";
import { startPglite } from "./pglite";

/**
 * One PGlite **per Vitest worker**, held as a module-level singleton.
 *
 * `setupFiles` and module state are per test *file*, so without this the ~120ms restore would be
 * paid per file rather than per worker (ADR-0017). The promise itself is the lock — a second caller
 * awaits the first rather than starting a second database.
 *
 * **Nothing closes it, deliberately.** There is no per-worker teardown hook in Vitest — a
 * `globalSetup` teardown runs in the main process, and an `afterAll` in a setup file runs per test
 * file, which would close the singleton the next file still needs. The worker process is the
 * lifetime, and Vitest ends it.
 */
let instance: Promise<Db> | undefined;

export function testDatabase(templatePath: string): Promise<Db> {
  instance ??= create(templatePath);
  return instance;
}

async function create(templatePath: string): Promise<Db> {
  // `new Uint8Array(…)` rather than the `Buffer` itself: a Buffer's backing store is
  // `ArrayBufferLike`, which `BlobPart` does not accept.
  const template = new Blob([new Uint8Array(await readFile(templatePath))]);
  const { pool } = await startPglite(template);

  // `casing` matches `client.ts`, so a query written against a module's table names the same
  // columns here as it does in production.
  return drizzle(pool, { schema, casing: "snake_case" });
}
