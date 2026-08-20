import type { Db, Tx } from "@repo/db";
import { persons } from "@repo/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import { isAdult, MINIMUM_AGE_YEARS } from "./age";

/**
 * A Person, as anything outside this module sees them.
 *
 * **Two columns are omitted and both omissions are decisions.** `id` is ADR-0003's internal
 * `bigint`, which never crosses the repository boundary — omitting it here makes that a compile
 * error rather than a review note. `dateOfBirth` is ADR-0007's: it is *"stored, never displayed, and
 * never present on a public type or a search filter, because age is a discrimination vector"*. It is
 * read exactly once, by the gate below, and there is no caller that needs it afterwards — so the
 * cheapest way to keep that true forever is to give callers no way to reach it.
 */
export type Person = Omit<typeof persons.$inferSelect, "id" | "dateOfBirth">;

export interface CreatePersonInput {
  /** Authored by the person, always (ADR-0009). Never a provider profile's version of their name. */
  readonly fullName: string;
  /** `YYYY-MM-DD`. Checked here and never returned. */
  readonly dateOfBirth: string;
}

/** Refusing an account is the correct outcome, so this is thrown rather than returned as a null. */
export class UnderageError extends Error {
  readonly code = "PERSON_UNDERAGE";

  constructor() {
    super(`a Person must be at least ${String(MINIMUM_AGE_YEARS)} years old`);
    this.name = "UnderageError";
  }
}

/**
 * Write the `persons` row.
 *
 * **`user_id` is null when this returns**, and that is ADR-0007's ordering rather than an oversight:
 * our transaction writes this row and its `consents` rows *before* Better Auth creates the `users`
 * row, so that a crash in between leaves personal data **with** its consent record rather than an
 * authentication account with no authorisation behind it. `linkToUser` closes the seam afterwards.
 *
 * **The age gate is enforced here as well as in the use case**, and the duplication is deliberate.
 * `signUp` checks it to give the form a refusal it can render; this checks it because a `persons`
 * row is the thing Ley 1581 art. 7 forbids for a minor, and the rule should not depend on every
 * future caller of this function remembering. The database cannot express it — the gate moves every
 * midnight — so this function is the last place it can live.
 */
export async function createPerson(
  db: Db | Tx,
  input: CreatePersonInput,
  now: Date = new Date(),
): Promise<Person> {
  if (!isAdult(input.dateOfBirth, now)) throw new UnderageError();

  const [row] = await db
    .insert(persons)
    .values({ fullName: input.fullName.trim(), dateOfBirth: input.dateOfBirth })
    .returning();

  // A single-row insert's `returning()` yields exactly one row; this is for
  // `noUncheckedIndexedAccess` rather than for a case that happens.
  if (!row) throw new Error("persons insert returned no row");

  return withoutPrivateColumns(row);
}

/**
 * Close ADR-0002's seam: attach the authentication account this Person just created.
 *
 * Separate from `createPerson` because the two cannot share a transaction. The Better Auth audit
 * establishes that `DrizzleAdapterConfig.transaction` governs Better Auth's *own* transaction and
 * that there is no documented way to enlist `signUpEmail` in one we opened — which is the fact the
 * person-before-user ordering exists to survive rather than a limitation to work around.
 *
 * Returns `undefined` when no unlinked Person with that id exists, so a caller can tell a lost race
 * from a success. It refuses to move a link that is already set: `userId` is unique, and silently
 * repointing a Person at a different authentication account is the one mistake here that would be
 * invisible afterwards.
 */
export async function linkToUser(
  db: Db | Tx,
  personPublicId: string,
  userId: string,
): Promise<Person | undefined> {
  const [row] = await db
    .update(persons)
    .set({ userId })
    // **`isNull` is load-bearing, not a micro-optimisation.** The unique constraint on `user_id`
    // stops two Persons sharing one authentication account; it does nothing to stop *one Person
    // being repointed at a different account*, which is the same column being written twice and is
    // perfectly legal SQL. Matching only an open seam makes this write once-only: a Person who
    // already has an account does not match, so the caller gets `undefined` and has to decide,
    // rather than silently taking someone else's account over.
    .where(and(eq(persons.publicId, personPublicId), isNull(persons.userId)))
    .returning();

  return row ? withoutPrivateColumns(row) : undefined;
}

/** The Person an authentication account belongs to, or `undefined` during the signup window. */
export async function personByUserId(db: Db | Tx, userId: string): Promise<Person | undefined> {
  const [row] = await db.select().from(persons).where(eq(persons.userId, userId)).limit(1);
  return row ? withoutPrivateColumns(row) : undefined;
}

export async function personByPublicId(db: Db | Tx, publicId: string): Promise<Person | undefined> {
  const [row] = await db.select().from(persons).where(eq(persons.publicId, publicId)).limit(1);
  return row ? withoutPrivateColumns(row) : undefined;
}

/** One place strips the two columns `Person` omits, so a new reader cannot forget one. */
function withoutPrivateColumns(row: typeof persons.$inferSelect): Person {
  const { id: _id, dateOfBirth: _dateOfBirth, ...person } = row;
  return person;
}
