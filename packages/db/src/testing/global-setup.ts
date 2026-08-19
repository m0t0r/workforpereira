import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { migrationsFolder } from "./paths";
import { extensions } from "./extensions";

declare module "vitest" {
  export interface ProvidedContext {
    /** Path to a tarball of a migrated, empty database. Read by `instance.ts` per worker. */
    databaseTemplate: string;
  }
}

/**
 * ADR-0017: **the migrations are the schema.** A test database is built by replaying
 * `packages/db/migrations` with the production `drizzle-orm/node-postgres/migrator`, never by
 * generating DDL from `src/schema/*.ts` — so the migration chain is under test on every run, and
 * the `RESTRICT` behaviour the erasure invariant asserts is the behaviour that actually shipped.
 *
 * Replaying costs about a second, so it happens **once per run**: migrate one PGlite here, dump
 * its data directory, and hand every worker the tarball to restore in ~120ms.
 */
export async function setup({
  provide,
}: {
  provide: (key: "databaseTemplate", value: string) => void;
}) {
  const pg = await PGlite.create({ extensions });
  const server = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
  await server.start();

  const pool = new Pool({ connectionString: connectionString(server.getServerConn()), max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
    await server.stop();
  }

  const dump = await pg.dumpDataDir("none");
  await pg.close();

  const dir = await mkdtemp(join(tmpdir(), "encuentra-db-"));
  const path = join(dir, "template.tar");
  await writeFile(path, Buffer.from(await dump.arrayBuffer()));
  provide("databaseTemplate", path);

  return async () => {
    await rm(dir, { recursive: true, force: true });
  };
}

/**
 * `getServerConn()` returns `host:port`, not a URL — the one operational wrinkle in
 * `pglite-socket`'s API. TCP on port 0 and never a Unix socket: the path limit is ~104 characters
 * and temporary directories exceed it routinely (ADR-0017).
 */
export function connectionString(serverConn: string): string {
  return `postgres://postgres@${serverConn}/postgres`;
}
