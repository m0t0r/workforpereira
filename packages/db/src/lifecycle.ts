import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

/**
 * What an erasure does to a table — ADR-0034's vocabulary.
 *
 * The first four are ADR-0021's retention behaviours, given names. `expires` is the one that is
 * not a category of data but an **admission**: this table holds personal data, an art. 15
 * _supresión_ will not reach it, and the only thing bounding it is that it clears itself. It
 * exists because before it there was no truthful thing to write for an IP-keyed counter, and what
 * happened instead — twice — was that nothing was written where a test could read it.
 */
export const ERASURE_CLASSIFICATIONS = [
  /** The subject's rows are deleted by the erasure sequence. */
  "with-person",
  /** The row survives with its person link nulled (ADR-0021: `offers`, `reports`). */
  "links-severed",
  /** The row survives on `subject_key`, `person_id` nulled (`consents`, `data_requests`). */
  "evidence",
  /** No personal data — reference data, and the texts evidence points at. */
  "impersonal",
  /** Personal data erasure cannot reach, bounded only by its own term. */
  "expires",
] as const;

export type ErasureClassification = (typeof ERASURE_CLASSIFICATIONS)[number];

export interface Lifecycle {
  erasure: ErasureClassification;
  /**
   * How long the row is kept, in prose. ADR-0021 generates the published _política_'s retention
   * schedule from these, so this string is read by a data subject and by the SIC — write it for
   * them, not for us. "12 months from terminal state", not "12mo".
   */
  term: string;
}

/**
 * **One line per table, and a table cannot merge without one** (ADR-0034).
 *
 * Keyed by the **SQL table name** — the first argument to `pgTable`, not the TypeScript export
 * name and not a Better Auth model name — because that is the only identity the reflective
 * enumeration in `lifecycle.invariant.test.ts` can compare against.
 *
 * It lives here rather than beside each table for two reasons. A lifecycle is a *table-level*
 * fact and ADR-0008's `columns.ts` spreads columns. And `src/schema/auth.ts` is generator-owned —
 * `auth generate` is a full-file overwrite, never a merge — so a declaration written beside those
 * tables is deleted by a routine command, with no diff anyone reads and no failure.
 *
 * ADR-0017's objection to a hand-written list does not apply, and the distinction is load-bearing:
 * that objection is about a list which is *also the enumeration*, where forgetting a line is
 * silent. Here the enumeration stays reflective, so forgetting a line is a red build.
 *
 * Empty because `src/schema/index.ts` is empty. The first table to land brings the first entry.
 */
export const lifecycle = {} satisfies Record<string, Lifecycle>;

type Declarations = Record<string, Lifecycle>;

/**
 * Every table in a drizzle schema module, by SQL name.
 *
 * `is(x, PgTable)` rather than a duck-type check, so enums, relations, views, `as const` literals
 * and helper functions are skipped. `drizzle.__drizzle_migrations` lives in its own schema and is
 * never a member of this object.
 */
export function schemaTableNames(schemaModule: Record<string, unknown>): string[] {
  return Object.values(schemaModule)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table));
}

/** Tables in the schema with no entry in `lifecycle`. A non-empty result is a red build. */
export function undeclaredTables(
  schemaModule: Record<string, unknown>,
  declarations: Declarations,
): string[] {
  return schemaTableNames(schemaModule)
    .filter((name) => !(name in declarations))
    .sort();
}

/**
 * Entries in `lifecycle` naming a table that is no longer in the schema — the other direction of
 * the same drift. A dropped table leaves a line behind, and that line would go on being published
 * in the _política_'s retention schedule as a thing we still hold.
 */
export function declaredWithNoTable(
  schemaModule: Record<string, unknown>,
  declarations: Declarations,
): string[] {
  const present = new Set(schemaTableNames(schemaModule));
  return Object.keys(declarations)
    .filter((name) => !present.has(name))
    .sort();
}
