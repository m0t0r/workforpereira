import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";

import { extensions } from "./extensions";

export interface RunningPglite {
  pg: PGlite;
  pool: Pool;
  close: () => Promise<void>;
}

/**
 * One PGlite, reachable over the Postgres wire protocol.
 *
 * ADR-0017: the socket rather than `drizzle-orm/pglite`, so `Db` stays exactly
 * `NodePgDatabase<typeof schema>` — `PgliteDatabase<T>` and `NodePgDatabase<T>` are not assignable,
 * and widening `Db` to their common base would make the production type vaguer for a test-only
 * reason. It also runs tests through the *same driver* as production, so `pg`'s connection
 * handling, prepared statements and error mapping are exercised rather than approximated.
 *
 * Both call sites — the migration replay in `global-setup.ts` and the per-worker restore in
 * `instance.ts` — come through here, so the `extensions` list cannot be passed at one and forgotten
 * at the other. Forgetting it does not fail at startup; it fails at the first `unaccent()`.
 */
export async function startPglite(loadDataDir?: Blob): Promise<RunningPglite> {
  const pg = await PGlite.create({ loadDataDir, extensions });

  try {
    // TCP on port 0, never a Unix socket: the path limit is ~104 characters and temporary
    // directories exceed it routinely.
    const server = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
    await server.start();

    // `max: 1`, because PGlite is single-connection — which is also why nothing concurrency- or
    // lock-shaped is testable anywhere in this repo. `getServerConn()` returns `host:port`, not a
    // URL.
    const pool = new Pool({
      connectionString: `postgres://postgres@${server.getServerConn()}/postgres`,
      max: 1,
    });

    return {
      pg,
      pool,
      close: async () => {
        await pool.end();
        await server.stop();
        await pg.close();
      },
    };
  } catch (error) {
    // Without this the PGlite survives a failed `server.start()`. In `globalSetup` that runs in
    // Vitest's *main* process, where a leaked listening socket can keep the run from exiting at
    // all — a hang instead of the error that caused it.
    await pg.close();
    throw error;
  }
}
