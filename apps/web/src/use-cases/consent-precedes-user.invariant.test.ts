/**
 * **Invariant Test — ADR-0007.** No `users` row may exist without consent evidence that predates it.
 *
 * Ley 1581 art. 9 requires _autorización previa_; art. 17(b) requires us to conserve a copy; D.1377
 * art. 5 requires the consent "a más tardar en el momento de la recolección". Writing a `users` row
 * is already _tratamiento_ — an email address and a name, held for a _finalidad_ that does not exist
 * yet — so an account without authorisation behind it is not an untidy state, it is the violation.
 *
 * ADR-0008 sharpens the same point from the operational side: with hard deletes, `RESTRICT` by
 * default and no `deleted_at`, such a row is **owned by nobody and covered by no erasure path**.
 *
 * ## Why this is phrased as timestamps and never as insert order
 *
 * ADR-0007's password path writes `persons` and its `consents` rows **before** Better Auth's `users`
 * row. **ADR-0009 inverts that for OAuth** — Better Auth creates the user inside
 * `GET /api/auth/callback/:id`, where there is no form payload, so `persons` follows in
 * `user.create.after` with consent already proven by a short-lived pending-signup record.
 *
 * An assertion written as *"the `persons` row was inserted first"* would go red the day #71 lands,
 * while the legal rule it stands for would be perfectly intact — and the pressure would then be to
 * weaken the invariant rather than to look at the code. What both paths preserve is the thing the
 * article actually requires: **the consent was given before the account existed.** On the OAuth path
 * the pending-signup record carries decisions made on our own form *before* the redirect, so
 * `granted_at` still precedes `users.created_at` even though the row lands later.
 *
 * So this asserts on the timestamps, through `usersWithoutPrecedingConsent`, and never on the
 * sequence. **Never weakened without amending ADR-0007.**
 */

import { consents, persons, users } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { unlinkedUsers, usersWithoutPrecedingConsent } from "@repo/consent";
import { eq } from "drizzle-orm";

import {
  MIDDAY,
  recordingAuthUsers,
  seedFixtureDocuments,
  SIGNUP,
  TEST_SUBJECT_KEY_SECRET,
} from "./fixtures";
import { signUp, type SignUpDeps } from "./sign-up";

function deps(overrides: Partial<SignUpDeps> = {}): SignUpDeps {
  return {
    createAuthUser: recordingAuthUsers().createAuthUser,
    subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
    now: () => MIDDAY,
    ...overrides,
  };
}

describe("a users row cannot exist without consent evidence predating it", () => {
  it(
    "holds after an ordinary signup",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      await signUp(tx, SIGNUP, deps());

      expect(await usersWithoutPrecedingConsent(tx)).toEqual([]);
    }),
  );

  it(
    "holds after several signups",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      await signUp(tx, SIGNUP, deps());
      await signUp(tx, { ...SIGNUP, email: "hector@example.test" }, deps());
      await signUp(tx, { ...SIGNUP, email: "wilmar@example.test" }, deps());

      expect(await usersWithoutPrecedingConsent(tx)).toEqual([]);
    }),
  );

  // The detector has to detect. An invariant test that only ever sees the good case proves that the
  // fixtures are well-behaved, not that the rule is enforced.
  it(
    "catches an account created with no Person at all",
    withRollback(async (tx) => {
      const at = new Date();
      await tx.insert(users).values({
        id: "user_smuggled",
        name: "Cuenta Sin Autorización",
        email: "smuggled@example.test",
        createdAt: at,
        updatedAt: at,
      });

      expect(await usersWithoutPrecedingConsent(tx)).toEqual(["user_smuggled"]);
    }),
  );

  it(
    "catches an account whose Person has no consents",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const at = new Date();

      await tx.insert(users).values({
        id: "user_unauthorised",
        name: "Persona Sin Autorización",
        email: "unauthorised@example.test",
        createdAt: at,
        updatedAt: at,
      });
      await tx.insert(persons).values({
        userId: "user_unauthorised",
        fullName: "Persona Sin Autorización",
        dateOfBirth: "1991-04-02",
      });

      expect(await usersWithoutPrecedingConsent(tx)).toEqual(["user_unauthorised"]);
    }),
  );

  // The subtle one, and the reason the query compares instants rather than counting rows: consent
  // gathered *after* the account is not _autorización previa_, however complete it looks afterwards.
  it(
    "catches consent recorded after the account was created",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const auth = recordingAuthUsers();
      const result = await signUp(tx, SIGNUP, deps({ createAuthUser: auth.createAuthUser }));

      // Move every consent to an hour after the account. Nothing in the product does this; the point
      // is that if something ever did, this is what would see it.
      const [user] = await tx
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, result.userId));
      await tx.update(consents).set({ grantedAt: new Date(user!.createdAt.getTime() + 3_600_000) });

      expect(await usersWithoutPrecedingConsent(tx)).toEqual([result.userId]);
    }),
  );

  // ADR-0007 designs this window on purpose, and the invariant must stay green inside it — otherwise
  // the correct behaviour would look like a violation and the pressure would be to "fix" the design.
  it(
    "stays green when Better Auth refused and left the Person behind",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const refuse = () => Promise.reject(new Error("USER_ALREADY_EXISTS"));

      await expect(signUp(tx, SIGNUP, deps({ createAuthUser: refuse }))).rejects.toThrow();

      // A Person with consent and no account. Deletable, re-linkable, and authorised.
      expect(await tx.select().from(persons)).toHaveLength(1);
      expect(await usersWithoutPrecedingConsent(tx)).toEqual([]);
    }),
  );
});

describe("the signup window", () => {
  it(
    "is empty after a completed signup",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      await signUp(tx, SIGNUP, deps());

      expect(await unlinkedUsers(tx)).toEqual([]);
    }),
  );

  it(
    "names an account that never got linked",
    withRollback(async (tx) => {
      const at = new Date();
      await tx.insert(users).values({
        id: "user_halfway",
        name: "A Medias",
        email: "halfway@example.test",
        createdAt: at,
        updatedAt: at,
      });

      // This is what `databaseHooks.session.create.before` refuses a session to, and what the sweep
      // clears. It is a subset of the violation above — a user with no Person trivially has no
      // consent — but it wants a different response, which is why it has its own query.
      expect(await unlinkedUsers(tx)).toEqual(["user_halfway"]);
    }),
  );
});
