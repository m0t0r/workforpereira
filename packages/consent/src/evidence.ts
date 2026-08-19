import type { Db, Tx } from "@repo/db";
import { consents, persons, users } from "@repo/db/schema";
import { and, eq, exists, lte, sql } from "drizzle-orm";

/**
 * **The art. 9 rule, as a query: no authentication account may exist without consent evidence that
 * predates it.**
 *
 * This is what `consent-precedes-user.invariant.test.ts` asserts over, and it is written as a
 * *module function* rather than inline in the test for a reason ADR-0017 cares about: the invariant
 * has to be assertable from anywhere — a test today, a `/api/jobs/*` audit sweep tomorrow, an
 * operator's console during an incident. A query that only exists inside a test file guards only the
 * fixtures that test happens to write.
 *
 * **Written against the rule, not the ordering, so it survives ADR-0009's amendment.** ADR-0007's
 * password path writes `persons` and its `consents` rows *before* Better Auth's `users` row.
 * ADR-0009 inverts that for OAuth — Better Auth creates the user inside the provider callback, and
 * `persons` follows in `user.create.after` — so an assertion phrased as "the `persons` row was
 * inserted first" would go red the day #71 lands, while the legal rule it stands for would be
 * perfectly intact.
 *
 * What both paths do preserve is the thing the article actually requires: **the consent was given
 * before the account existed.** On the password path that is obvious. On the OAuth path the
 * pending-signup record carries decisions made on our own form *before* the redirect, so
 * `granted_at` still precedes `users.created_at` even though the row lands later. So the assertion
 * is on the timestamps and never on the insert order.
 */
export async function usersWithoutPrecedingConsent(db: Db | Tx): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(persons, eq(persons.userId, users.id))
    .where(
      sql`not ${exists(
        db
          .select({ one: sql`1` })
          .from(consents)
          .where(
            and(
              eq(consents.personId, persons.id),
              // `<=`, not `<`: one transaction writing the Person, the consents and then the user
              // can stamp identical instants, and "at the same moment" satisfies D.1377 art. 5's
              // *"a más tardar en el momento de la recolección"* exactly.
              lte(consents.grantedAt, users.createdAt),
            ),
          ),
      )}`,
    );

  return rows.map((row) => row.id);
}

/**
 * Authentication accounts with no `persons` row at all.
 *
 * A subset of the above — a user with no Person trivially has no consent — but worth naming
 * separately, because the two failures want different responses. This one is the **signup window**:
 * ADR-0007 accepts that a crash between `signUpEmail` and the link leaves exactly this, and
 * `databaseHooks.session.create.before` refuses it a session until the sweep clears it or a retry
 * links it. The broader query above is the one that would mean something went properly wrong.
 */
export async function unlinkedUsers(db: Db | Tx): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(persons, eq(persons.userId, users.id))
    .where(sql`${persons.id} is null`);

  return rows.map((row) => row.id);
}

/**
 * `persons` rows that never got an authentication account, older than the window.
 *
 * ADR-0007's sweep: *"a sweep deletes unlinked `persons` rows older than an hour"*. This finds them;
 * deleting them is the scheduled job's business (ADR-0028), and it is not a plain `DELETE` — these
 * rows have `consents` rows pointing at them under `RESTRICT`, which is ADR-0008 refusing to let an
 * abandoned signup take its own consent evidence with it silently.
 */
export async function abandonedSignups(db: Db | Tx, olderThan: Date): Promise<string[]> {
  const rows = await db
    .select({ publicId: persons.publicId })
    .from(persons)
    .where(and(sql`${persons.userId} is null`, lte(persons.createdAt, olderThan)));

  return rows.map((row) => row.publicId);
}
