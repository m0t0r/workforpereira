import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { Db } from "../client";
import * as schema from "../schema/index";
import { connectionString } from "./global-setup";
import { extensions } from "./extensions";

interface Instance {
  db: Db;
  close: () => Promise<void>;
}

/**
 * One PGlite **per Vitest worker**, held as a module-level singleton.
 *
 * `setupFiles` and module state are per test *file*, so without this the ~120ms restore would be
 * paid per file rather than per worker (ADR-0017). The promise itself is the lock — a second
 * caller awaits the first rather than starting a second database.
 */
let instance: Promise<Instance> | undefined;

export function testInstance(templatePath: string): Promise<Instance> {
  instance ??= create(templatePath);
  return instance;
}

async function create(templatePath: string): Promise<Instance> {
  const pg = await PGlite.create({
    // `new Uint8Array(…)` rather than the `Buffer` itself: a Buffer's backing store is
    // `ArrayBufferLike`, which `BlobPart` does not accept.
    loadDataDir: new Blob([new Uint8Array(await readFile(templatePath))]),
    extensions,
  });
  const server = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
  await server.start();

  // ADR-0017: `max: 1`, because PGlite is single-connection. This is also why nothing
  // concurrency- or lock-shaped is testable anywhere in this repo.
  const pool = new Pool({ connectionString: connectionString(server.getServerConn()), max: 1 });

  return {
    // `casing` matches `client.ts`, so a query written against a module's table names the same
    // columns here as it does in production.
    db: drizzle(pool, { schema, casing: "snake_case" }),
    close: async () => {
      await pool.end();
      await server.stop();
      await pg.close();
    },
  };
}
