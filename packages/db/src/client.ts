import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { databaseUrl } from "./env";
import * as schema from "./schema/index";

/**
 * ADR-0006: one pool, constructed once. Next.js builds a fresh module graph on every HMR reload in
 * development, so without the global cache a long dev session leaks a pool per edit until Postgres
 * refuses connections.
 */
const globalForDb = globalThis as typeof globalThis & {
  dbPool?: Pool;
  dbInstance?: NodePgDatabase<typeof schema>;
};

/**
 * The singleton handle, built on first use.
 *
 * **Lazily, deliberately.** `databaseUrl()` throws when `DATABASE_URL` is unset, so building the
 * pool at module scope would make merely *importing* this package require a connection string.
 * `next build` in CI (#15) has no root `.env`, and it loads every route's module graph to
 * prerender — so one route importing `@repo/db` would fail the whole build, including routes that
 * never touch the database. Deferring to first call keeps the single instance while letting a
 * build that never queries succeed.
 *
 * ADR-0006: **modules never call this** — every module function takes a `Db | Tx` as its first
 * argument, so a caller's transaction is the handle the module writes on. Only `apps/web` use
 * cases reach for it, at the point where a transaction boundary is opened.
 */
export function getDb(): Db {
  if (!globalForDb.dbInstance) {
    globalForDb.dbPool ??= new Pool({ connectionString: databaseUrl() });
    globalForDb.dbInstance = drizzle(globalForDb.dbPool, {
      schema,
      // Set here *as well as* in drizzle.config.ts. The config value governs what drizzle-kit
      // emits in migrations; this one governs the column names the runtime puts in queries. Two
      // different consumers, and a mismatch is silent until a query names a column that does not
      // exist.
      casing: "snake_case",
    });
  }
  return globalForDb.dbInstance;
}

export type Db = NodePgDatabase<typeof schema>;

/** The handle `db.transaction(...)` yields — a *different object* from the singleton (ADR-0006). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
