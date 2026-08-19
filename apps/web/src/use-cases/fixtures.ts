import type { Db, Tx } from "@repo/db";
import { users } from "@repo/db/schema";
import { DOCUMENT_CATALOGUE, seedDocumentVersions, SIGNUP_PURPOSES } from "@repo/consent";

import type { SignUpDeps, SignUpInput } from "./sign-up";

/**
 * Fixtures for the use-case tests, **duplicated from every package's on purpose** (ADR-0017). A
 * shared fixtures package would make `@repo/db/testing` depend on the modules whose tests depend on
 * it, inverting ADR-0006's DAG.
 */

/** 2026-08-19, 15:00 in Pereira. Every date-of-birth assertion is relative to this. */
export const MIDDAY = new Date("2026-08-19T20:00:00Z");

/** Long enough to satisfy `subjectKey`'s minimum, and obviously not a real one. */
export const TEST_SUBJECT_KEY_SECRET = "test-subject-key-secret-not-for-any-real-environment";

/** One ordinary signup: over eighteen, all four boxes answered, the three required ones ticked. */
export const SIGNUP: SignUpInput = {
  fullName: "Yeimy Osorio",
  dateOfBirth: "1991-04-02",
  email: "yeimy@example.test",
  password: "una contraseña larga",
  decisions: SIGNUP_PURPOSES.map((purpose) => ({ purpose, isGranted: true })),
};

/**
 * The legal documents, with short bodies standing in for the real Spanish markdown.
 *
 * Reading `docs/legal/` here would make these tests fail on a typo fix in a sentence. What matters
 * to the use case is that a version is frozen and that a disclosure pins the other two.
 */
export async function seedFixtureDocuments(db: Db | Tx): Promise<void> {
  await seedDocumentVersions(
    db,
    DOCUMENT_CATALOGUE.map((document) => ({
      ...document,
      body: `# ${document.slug} ${document.version}\n\nfixture body\n`,
    })),
  );
}

/**
 * A stand-in for `auth.api.signUpEmail` that writes the `users` row directly and remembers what it
 * was asked for.
 *
 * **This is not mocking the database** — ADR-0017's rule is that the database is never mocked, and
 * this writes a real row to the real schema on PGlite. What is substituted is Better Auth's
 * HTTP-shaped API, which ADR-0017 does not make a seam and which cannot join our transaction anyway:
 * the audit establishes there is no documented way to enlist `signUpEmail` in one we opened, and
 * that fact is precisely what the person-before-user ordering exists to survive.
 *
 * `createdAt` is stamped at call time so the ordering assertion measures the real sequence.
 * `updatedAt` is explicit because the generated schema marks it `NOT NULL` with no database default.
 */
export function recordingAuthUsers(): {
  createAuthUser: SignUpDeps["createAuthUser"];
  readonly created: { name: string; email: string; password: string }[];
} {
  const created: { name: string; email: string; password: string }[] = [];

  return {
    created,
    createAuthUser: async (db, input) => {
      created.push({ name: input.name, email: input.email, password: input.password });

      const id = `user_${input.email}`;
      const at = new Date();
      await db
        .insert(users)
        .values({ id, name: input.name, email: input.email, createdAt: at, updatedAt: at });

      return { userId: id };
    },
  };
}
