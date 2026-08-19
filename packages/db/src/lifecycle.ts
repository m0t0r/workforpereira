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
 * One entry so far; every table that lands after it brings its own line.
 */
export const lifecycle = {
  /**
   * `with-person` because the row holds a recipient address, and ADR-0021's erasure is a real
   * delete — pending and sent rows alike are reachable from the subject and should go with them.
   *
   * **What this line does not claim.** Erasure reaches the *row*, never the *message*. Once the
   * provider has accepted it, a delivered email sits in a mailbox and in Resend's own logs, outside
   * every adapter this repository has and outside anything a drizzle schema can enumerate. That is
   * the map's live fog on _what an erasure cannot reach once it leaves the database_ (ADR-0034),
   * sharpened by this table rather than closed by it. `expires` would be the wrong word here: it
   * describes a table erasure cannot reach, and this one it can.
   *
   * The term is short because nothing obliges us to keep it. A sent row has no evidentiary duty —
   * ADR-0007's proof of authorization lives in `consents`, not here — so the only purpose left
   * after delivery is answering "I never received it", which is a question asked within days.
   * Thirty days is _razonable y necesario_ for that and nothing longer is.
   *
   * It is anchored on **queueing** rather than on the last attempt, so that every row has an
   * anchor: a row that was never attempted at all — the outbox drained by nobody — has no
   * `sent_at` and no attempt to count from, and a term it cannot reach is a term the purge cannot
   * enforce.
   */
  notification_outbox: {
    erasure: "with-person",
    term: "30 days from sending, or from queueing if it never left",
  },

  /**
   * ADR-0002's seam and the Titular's own row. Everything an erasure is *for* is here, so it goes
   * with the Person by definition, and ADR-0021's erasure is a real delete rather than a redaction.
   */
  persons: {
    erasure: "with-person",
    term: "account lifetime",
  },

  /**
   * The authentication account. `sessions` and `accounts` reference `users.id` with `ON DELETE
   * CASCADE` — Better Auth's own choice, which ADR-0002 deliberately did not mirror on our side —
   * so deleting the `users` row takes both with it. `persons.user_id` is the sole `SET NULL` in the
   * schema and is what stops that cascade reaching the Titular.
   */
  users: { erasure: "with-person", term: "account lifetime" },
  sessions: { erasure: "with-person", term: "account lifetime (cascade from users)" },
  accounts: { erasure: "with-person", term: "account lifetime (cascade from users)" },

  /**
   * Better Auth's shared token bucket — password-reset tokens live here, keyed by `identifier`.
   *
   * **`expires`, not `with-person`, and the difference is the honest one ADR-0034 added the word
   * for.** There is **no foreign key to `users`**: a row is found by a string like
   * `reset-password:<token>`, so an erasure enumerating tables from the subject cannot reach it.
   * What bounds it is its own `expires_at` — an hour for a reset token — and nothing else. Writing
   * `with-person` here would claim a reach the erasure sequence does not have.
   */
  verifications: {
    erasure: "expires",
    term: "until the token expires — one hour for a password reset, 24 hours for a verification",
  },

  /**
   * **`evidence`, and this is the table the whole classification exists for.** Ley 1581 art. 17(b)
   * requires us to conserve proof of the authorisation we were given, so it must survive the
   * subject: ADR-0021 nulls `person_id` and leaves the row anchored on `subject_key`.
   *
   * Five years is our own proportionality judgement, documented in advance because the regime names
   * no number: the exposure this evidence exists to survive is the SIC's sanctioning power, which
   * CPACA art. 52 bounds at three years, so five covers the window with margin while anything
   * longer starts failing _razonable y necesario_.
   */
  consents: {
    erasure: "evidence",
    term: "5 years from account closure",
  },

  /**
   * The texts the evidence points at. **No personal data at all** — a `document_versions` row is a
   * published legal document, identical for everyone who was ever shown it, which is exactly why
   * `consents` can carry one foreign key instead of a copy of the text per person.
   *
   * Kept forever, and that is not laziness: D.1377 art. 16 requires retaining the model of every
   * _aviso_ for as long as obligations derived from it endure, and deleting one would strand every
   * `consents` row still pointing at it — including rows we are separately obliged to keep for five
   * years.
   */
  document_versions: {
    erasure: "impersonal",
    term: "indefinite — a consent five years old must still render the text it was given against",
  },
} satisfies Record<string, Lifecycle>;

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
  return (
    schemaTableNames(schemaModule)
      // `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a table named `constructor`,
      // `toString` or `valueOf` would count as declared and slip past ADR-0034's invariant silently.
      .filter((name) => !Object.hasOwn(declarations, name))
      .sort()
  );
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
