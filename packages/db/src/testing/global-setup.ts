import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { migrationsFolder } from "./config";
import { startPglite } from "./pglite";

/**
 * ADR-0017: **the migrations are the schema.** A test database is built by replaying
 * `packages/db/migrations` with the production `drizzle-orm/node-postgres/migrator`, never by
 * generating DDL from `src/schema/*.ts` — so the migration chain is under test on every run, and
 * the `RESTRICT` behaviour the erasure invariant asserts is the behaviour that actually shipped.
 *
 * Replaying costs about a second, so it happens **once per run**: migrate one PGlite here, dump its
 * data directory, and hand every worker the tarball to restore in ~120ms.
 *
 * The honest limit: migrations are applied exactly once per run, so this catches a broken migration
 * but never a non-idempotent one.
 */
export async function setup({
  provide,
}: {
  provide: (key: "databaseTemplate", value: string) => void;
}) {
  const { pg, pool, close } = await startPglite();

  let dump: Blob;
  try {
    await migrate(drizzle(pool), { migrationsFolder });
    dump = await pg.dumpDataDir("none");
  } finally {
    // `finally`, because this runs in Vitest's *main* process: a socket left listening after a
    // failed migration keeps the whole run from exiting, and the hang is what the developer sees
    // instead of the migration error.
    await close();
  }

  const dir = await mkdtemp(join(tmpdir(), "encuentra-db-"));
  try {
    const path = join(dir, "template.tar");
    await writeFile(path, Buffer.from(await dump.arrayBuffer()));
    provide("databaseTemplate", path);
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }

  return async () => {
    await rm(dir, { recursive: true, force: true });
  };
}
