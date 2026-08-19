/**
 * The harness testing itself (ADR-0017). Nothing here is a domain assertion — `@repo/db` holds no
 * table yet — so the probe is a table the test creates, which is also the sharpest available
 * demonstration that the savepoint discards *everything*, DDL included.
 */

import { sql } from "drizzle-orm";

import type { Db, Tx } from "../client";
import { withRollback } from "./rollback";

/** Both take a `Db | Tx`, which under ADR-0017 is what makes this an integration test. */
async function createProbe(db: Db | Tx): Promise<void> {
  await db.execute(sql`create table harness_probe (note text not null)`);
  await db.execute(sql`insert into harness_probe (note) values ('written')`);
}

async function probeRows(db: Db | Tx): Promise<string[]> {
  const exists = await db.execute<{ present: boolean }>(
    sql`select to_regclass('public.harness_probe') is not null as present`,
  );
  if (!exists.rows[0]?.present) return [];
  const rows = await db.execute<{ note: string }>(sql`select note from harness_probe`);
  return rows.rows.map((row) => row.note);
}

describe("the integration harness", () => {
  it(
    "hands out a handle that writes",
    withRollback(async (tx) => {
      await createProbe(tx);
      expect(await probeRows(tx)).toEqual(["written"]);
    }),
  );

  it(
    "has rolled the previous test back before this one starts",
    withRollback(async (tx) => {
      expect(await probeRows(tx)).toEqual([]);
    }),
  );

  it(
    "replays the migrations rather than deriving the schema, so the extensions are present",
    withRollback(async (tx) => {
      // Both come from migration `0000_enable_extensions.sql`. If the schema were generated from
      // `src/schema/*.ts` neither would exist, and neither would the `RESTRICT` behaviour the
      // erasure invariant is built to assert.
      const result = await tx.execute<{ folded: string; score: number }>(
        sql`select unaccent('atención') as folded, similarity('mesero', 'mesera') as score`,
      );
      expect(result.rows[0]?.folded).toBe("atencion");
      expect(Number(result.rows[0]?.score)).toBeGreaterThan(0.5);
    }),
  );

  it(
    "degrades a nested transaction to a savepoint, so a use case's own boundary still rolls back",
    withRollback(async (tx) => {
      await createProbe(tx);
      await tx.transaction(async (inner) => {
        await inner.execute(sql`insert into harness_probe (note) values ('inner')`);
      });
      expect(await probeRows(tx)).toEqual(["written", "inner"]);
    }),
  );
});
