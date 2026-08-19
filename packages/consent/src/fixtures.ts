import type { Db, Tx } from "@repo/db";
import { users } from "@repo/db/schema";
import { createPerson } from "@repo/people";

import type { ConsentDecision } from "./consents";
import { DOCUMENT_CATALOGUE } from "./documents";
import { SIGNUP_PURPOSES } from "./purposes";
import { seedDocumentVersions, type AuthoredDocument } from "./seed";

/**
 * Test fixtures, **duplicated from every other package's on purpose and forever** (ADR-0017).
 *
 * A shared fixtures package would have to depend on the modules whose tests depend on the harness,
 * which inverts ADR-0006's DAG. The duplication is the price of the DAG holding, and it is cheap.
 */

/** Long enough to satisfy `subjectKey`'s minimum, and obviously not a real one. */
export const TEST_SUBJECT_KEY_SECRET = "test-subject-key-secret-not-for-any-real-environment";

/**
 * The catalogue with short bodies standing in for the real markdown.
 *
 * The **text** is irrelevant to every rule in this package — what matters is that a version is
 * frozen, that its hash is the hash of whatever was frozen, and that a disclosure pins the other
 * two. Reading `docs/legal/` here would make these tests fail on a typo fix in a Spanish sentence.
 */
export function fixtureDocuments(): AuthoredDocument[] {
  return DOCUMENT_CATALOGUE.map((document) => ({
    ...document,
    body: `# ${document.slug} ${document.version}\n\nfixture body\n`,
  }));
}

/** Seed the documents a signup consent needs to point at. */
export async function seedFixtureDocuments(db: Db | Tx): Promise<void> {
  await seedDocumentVersions(db, fixtureDocuments());
}

/** A Person, comfortably over eighteen. */
export async function insertPerson(db: Db | Tx, fullName = "Yeimy Osorio") {
  return createPerson(db, { fullName, dateOfBirth: "1991-04-02" });
}

/**
 * A Better Auth `users` row, written directly — the tests here are about consent, not about Better
 * Auth's API.
 *
 * `updatedAt` is explicit because the generated schema marks it `NOT NULL` with no database default:
 * Better Auth always supplies it, so the omission only bites a hand-written insert.
 */
export async function insertUser(
  db: Db | Tx,
  email: string,
  createdAt: Date = new Date(),
): Promise<string> {
  const id = `user_${email}`;
  await db
    .insert(users)
    .values({ id, name: "Nombre Apellido", email, createdAt, updatedAt: createdAt });
  return id;
}

/** All four boxes, with the three required ones ticked. The ordinary signup. */
export function allSignupBoxesTicked(news = true): ConsentDecision[] {
  return SIGNUP_PURPOSES.map((purpose) => ({
    purpose,
    isGranted: purpose === "news" ? news : true,
  }));
}
