import type { Db, Tx } from "@repo/db";
import { users } from "@repo/db/schema";
import { createPerson } from "@repo/people";

import type { ConsentDecision } from "./consents";

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

/** The one version every fixture document is stamped with. */
export const FIXTURE_VERSION = "2026-08-19";
const FIXTURE_EFFECTIVE_FROM = "2026-08-19T00:00:00.000Z";

/**
 * The three documents a signup consent needs, with short bodies standing in for the real markdown.
 *
 * **Written out here rather than read from anywhere.** The **text** is irrelevant to every rule in
 * this package — what matters is that a version is frozen, that its hash is the hash of whatever was
 * frozen, and that a disclosure pins the other two. Reading `docs/legal/` would make these tests fail
 * on a typo fix in a Spanish sentence, and reading a catalogue would make them fail the day a real
 * document is added.
 *
 * The order is load-bearing: `seedDocumentVersions` resolves a disclosure's pins as it goes, so the
 * _política_ and the _aviso_ have to be inserted before the disclosure that pins them.
 */
export function fixtureDocuments(): AuthoredDocument[] {
  const body = (slug: string) => `# ${slug} ${FIXTURE_VERSION}\n\nfixture body\n`;

  return [
    {
      kind: "processing_policy",
      slug: "processing-policy",
      version: FIXTURE_VERSION,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      body: body("processing-policy"),
    },
    {
      kind: "privacy_notice",
      slug: "privacy-notice",
      version: FIXTURE_VERSION,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      body: body("privacy-notice"),
    },
    {
      kind: "disclosure",
      slug: "disclosure-signup",
      version: FIXTURE_VERSION,
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      surface: "signup",
      pins: {
        processingPolicy: { slug: "processing-policy", version: FIXTURE_VERSION },
        privacyNotice: { slug: "privacy-notice", version: FIXTURE_VERSION },
      },
      body: body("disclosure-signup"),
    },
  ];
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

/**
 * Every signup box ticked. The ordinary signup.
 *
 * **No parameter any more.** It used to take `news` so a test could build the one interesting
 * partial set — every box ticked except the optional one. With `news` gone every signup Purpose is
 * required, so the only sets that exist are "all of them" and "one short of an account", and a test
 * that wants the second builds it by filtering this one.
 */
export function allSignupBoxesTicked(): ConsentDecision[] {
  return SIGNUP_PURPOSES.map((purpose) => ({ purpose, isGranted: true }));
}
