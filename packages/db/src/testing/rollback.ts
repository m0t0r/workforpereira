import { inject } from "vitest";

import type { Tx } from "../client";
import { testInstance } from "./instance";

/** Thrown to unwind the transaction. Never escapes `withRollback`. */
class Rollback extends Error {}

/**
 * Runs one test inside a transaction that is always rolled back.
 *
 * ```ts
 * it("records the consent", withRollback(async (tx) => {
 *   await grantConsent(tx, personId, "safety");
 *   expect(await hasConsented(tx, personId, "safety")).toBe(true);
 * }));
 * ```
 *
 * ADR-0006 built the `Db | Tx` seam for legal reasons — a module writing outside its caller's
 * transaction would leave contact details disclosed for an offer that was never accepted. ADR-0017
 * spends it a second time, here: isolation is a savepoint, so a use case's own `db.transaction()`
 * degrades to a nested savepoint and everything the test wrote is discarded.
 *
 * Two limits are inherent rather than chosen. A test that rolls back cannot observe anything
 * requiring a real commit. And **no test may assert on a generated `bigint` id** — identity
 * sequences do not roll back, so those values depend on file execution order. ADR-0003 already
 * made the app-side UUIDv7 `public_id` the identifier anything outside the database uses.
 */
export function withRollback(fn: (tx: Tx) => Promise<void>): () => Promise<void> {
  return async () => {
    const { db } = await testInstance(inject("databaseTemplate"));
    try {
      await db.transaction(async (tx) => {
        await fn(tx);
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };
}
