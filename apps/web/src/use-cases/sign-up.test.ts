import { consents, documentVersions, persons, users } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { eq } from "drizzle-orm";

import { signUp, SignUpAccountCreationError, type SignUpDeps } from "./sign-up";
import {
  MIDDAY,
  recordingAuthUsers,
  seedFixtureDocuments,
  SIGNUP,
  TEST_SUBJECT_KEY_SECRET,
} from "./fixtures";

/**
 * **The primary seam** (ADR-0017): a use case is where a multi-table legal invariant is observable
 * at all, and this one carries three that no module function can see on its own — the ordering, the
 * four rows, and the link.
 *
 * Written **test-first**, which ADR-0017 makes mandatory here rather than optional: for a use case
 * the ADR describes the behaviour before any code exists, so the failing test is a transcription
 * rather than a guess.
 */

function deps(overrides: Partial<SignUpDeps> = {}): SignUpDeps {
  return {
    createAuthUser: recordingAuthUsers().createAuthUser,
    subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
    now: () => MIDDAY,
    ...overrides,
  };
}

describe("signing up", () => {
  it(
    "creates a Person, their consents and their authentication account",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      const result = await signUp(tx, SIGNUP, deps());

      expect(result.person.fullName).toBe("Yeimy Osorio");
      expect(result.person.userId).toBe(result.userId);
    }),
  );

  // The acceptance criterion, and the whole reason this is a use-case test: the ordering is not
  // observable from inside `@repo/people` or `@repo/consent` alone.
  it(
    "writes the persons row before the users row",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      const result = await signUp(tx, SIGNUP, deps());

      const [person] = await tx
        .select({ createdAt: persons.createdAt })
        .from(persons)
        .where(eq(persons.publicId, result.person.publicId));
      const [user] = await tx
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, result.userId));

      expect(person).toBeDefined();
      expect(user).toBeDefined();
      // `<=` rather than `<`: the two can land in the same millisecond, and "at the same moment"
      // satisfies D.1377 art. 5's *a más tardar en el momento de la recolección* exactly.
      expect(person!.createdAt.getTime()).toBeLessThanOrEqual(user!.createdAt.getTime());
    }),
  );

  it(
    "writes one consents row per Purpose, each pointing at a frozen document version",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      await signUp(tx, SIGNUP, deps());

      const rows = await tx
        .select({
          purpose: consents.purpose,
          isGranted: consents.isGranted,
          kind: documentVersions.kind,
          slug: documentVersions.slug,
        })
        .from(consents)
        .innerJoin(documentVersions, eq(documentVersions.id, consents.documentVersionId));

      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(row.kind).toBe("disclosure");
        expect(row.slug).toBe("disclosure-signup");
      }
    }),
  );

  it(
    "records a refusal of the optional Purpose as deliberately as a grant",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      await signUp(
        tx,
        {
          ...SIGNUP,
          decisions: SIGNUP.decisions.map((d) =>
            d.purpose === "news" ? { ...d, isGranted: false } : d,
          ),
        },
        deps(),
      );

      const [news] = await tx
        .select({ isGranted: consents.isGranted })
        .from(consents)
        .where(eq(consents.purpose, "news"));

      // The refusal is the evidence that the box was rendered, unticked and separately selectable —
      // which is what D.1377 art. 7's ban on treating silence as consent actually asks us to show.
      expect(news?.isGranted).toBe(false);
    }),
  );

  it(
    "hands Better Auth the name the person authored",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const auth = recordingAuthUsers();

      await signUp(tx, SIGNUP, deps({ createAuthUser: auth.createAuthUser }));

      // ADR-0009: the name is always authored by the person, never taken from a provider profile.
      // When #71 adds Google and Facebook, `mapProfileToUser` writes this string and the provider's
      // version never lands.
      expect(auth.created).toEqual([
        { name: "Yeimy Osorio", email: "yeimy@example.test", password: "una contraseña larga" },
      ]);
    }),
  );
});

describe("refusing to sign someone up", () => {
  it(
    "refuses a date of birth under eighteen",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      // Ley 1581 art. 7. Refused before anything at all is written.
      await expect(signUp(tx, { ...SIGNUP, dateOfBirth: "2012-01-01" }, deps())).rejects.toThrow(
        /18/,
      );

      expect(await tx.select().from(persons)).toHaveLength(0);
      expect(await tx.select().from(consents)).toHaveLength(0);
    }),
  );

  it(
    "never reaches Better Auth when the age gate refuses",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const auth = recordingAuthUsers();

      await expect(
        signUp(
          tx,
          { ...SIGNUP, dateOfBirth: "2012-01-01" },
          deps({ createAuthUser: auth.createAuthUser }),
        ),
      ).rejects.toThrow();

      // An email address held for an account we refused to create would be personal data with no
      // _finalidad_ behind it — exactly what the ordering exists to prevent.
      expect(auth.created).toEqual([]);
    }),
  );

  it(
    "refuses when a required Purpose is not granted, and writes nothing",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const auth = recordingAuthUsers();
      const decisions = SIGNUP.decisions.map((d) =>
        d.purpose === "safety" ? { ...d, isGranted: false } : d,
      );

      await expect(
        signUp(tx, { ...SIGNUP, decisions }, deps({ createAuthUser: auth.createAuthUser })),
      ).rejects.toThrow(/safety/);

      expect(await tx.select().from(persons)).toHaveLength(0);
      expect(await tx.select().from(consents)).toHaveLength(0);
      expect(auth.created).toEqual([]);
    }),
  );

  it(
    "rolls the Person back when the consents cannot be written",
    withRollback(async (tx) => {
      // No documents seeded: there is no art. 12 artefact to point at, so a `consents` row would be
      // evidence of nothing.
      await expect(signUp(tx, SIGNUP, deps())).rejects.toThrow();

      expect(await tx.select().from(persons)).toHaveLength(0);
    }),
  );
});

describe("when Better Auth refuses after the Person is committed", () => {
  // ADR-0007 designs this window rather than tolerating it. The orphan it produces is a `persons`
  // row **with** its consent record — deletable, and re-linkable by email on retry — where the other
  // ordering would produce a `users` row holding an email address with no authorisation at all.
  it(
    "leaves the Person and their consents behind, unlinked",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const refuse = () => Promise.reject(new Error("USER_ALREADY_EXISTS"));

      await expect(signUp(tx, SIGNUP, deps({ createAuthUser: refuse }))).rejects.toThrow(
        SignUpAccountCreationError,
      );

      const [person] = await tx.select().from(persons);
      expect(person).toBeDefined();
      expect(person?.userId).toBeNull();
      expect(await tx.select().from(consents)).toHaveLength(4);
    }),
  );

  it(
    "says which failure it was, so the form can tell the person something true",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const refuse = () => Promise.reject(new Error("USER_ALREADY_EXISTS"));

      await expect(signUp(tx, SIGNUP, deps({ createAuthUser: refuse }))).rejects.toThrow(
        /USER_ALREADY_EXISTS/,
      );
    }),
  );
});

describe("the input", () => {
  it(
    "trims and lowercases the address before it is hashed",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const auth = recordingAuthUsers();

      await signUp(
        tx,
        { ...SIGNUP, email: "  YEIMY@Example.Test " },
        deps({ createAuthUser: auth.createAuthUser }),
      );

      // One normalisation, applied once, before both the account and the subject key — otherwise a
      // Titular who signs up with a capital letter cannot later be found by the address they type.
      expect(auth.created[0]?.email).toBe("yeimy@example.test");
    }),
  );
});
