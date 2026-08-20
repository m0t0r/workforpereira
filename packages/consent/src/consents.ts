import type { Db, Tx } from "@repo/db";
import { consents, documentVersions, persons, type Purpose } from "@repo/db/schema";
import { and, desc, eq } from "drizzle-orm";

import { currentDisclosure } from "./documents";
import { PURPOSE_METADATA, REQUIRED_SIGNUP_PURPOSES, SIGNUP_PURPOSES } from "./purposes";
import { documentVersionId } from "./seed";
import { subjectKey } from "./subject-key";

/**
 * A Consent, as anything outside this module sees it. The internal `bigint` keys never leave
 * (ADR-0003), and `subjectKey` does not either — it is an erasure-survival anchor, not a fact about
 * a live Person, and handing it out would put a stable pseudonymous identifier on a surface that has
 * no use for one.
 */
export type Consent = Omit<
  typeof consents.$inferSelect,
  "id" | "personId" | "documentVersionId" | "subjectKey"
>;

/** One box, ticked or not. A refusal is recorded exactly as deliberately as a grant (ADR-0007). */
export interface ConsentDecision {
  readonly purpose: Purpose;
  readonly isGranted: boolean;
}

export interface RecordSignupConsentsInput {
  /** ADR-0003's public identifier: the internal `bigint` never crosses this boundary. */
  readonly personPublicId: string;
  /** Hashed into `subject_key` and not stored. The identity anchor is `users.email` (ADR-0021). */
  readonly email: string;
  readonly subjectKeySecret: string;
  /** All four signup boxes, in any order. */
  readonly decisions: readonly ConsentDecision[];
  readonly now?: Date;
}

export class MissingConsentDecisionError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `every Purpose asked at /signup must carry a decision, and ${missing.join(", ")} carried ` +
        `none. A refusal is a decision; silence is not (D.1377 art. 7).`,
    );
    this.name = "MissingConsentDecisionError";
  }
}

export class UnexpectedConsentDecisionError extends Error {
  constructor(unexpected: readonly string[]) {
    super(
      `${unexpected.join(", ")} is not consented at /signup and cannot be recorded there. ` +
        `publish, disclose_contact and photo are consented in context (ADR-0007).`,
    );
    this.name = "UnexpectedConsentDecisionError";
  }
}

/**
 * The same Purpose answered twice in one submission.
 *
 * Its own type rather than an `UnexpectedConsentDecisionError` carrying the prose
 * `"a Purpose decided twice"` in a slot that holds Purpose *names* — which rendered the sentence
 * *"a Purpose decided twice is not consented at /signup"*. A duplicate is also a different failure:
 * the Purpose belongs at signup, and what is wrong is that the form sent two answers for it, which
 * is a bug in the caller rather than a Purpose in the wrong place.
 */
export class DuplicateConsentDecisionError extends Error {
  constructor(readonly duplicated: readonly string[]) {
    super(
      `${duplicated.join(", ")} was decided more than once. Each Purpose is one box and one answer ` +
        `(D.1377 art. 7), so two answers for one Purpose has no meaning to record.`,
    );
    this.name = "DuplicateConsentDecisionError";
  }
}

export class RequiredConsentRefusedError extends Error {
  constructor(readonly refused: readonly string[]) {
    super(
      `${refused.join(", ")} is required and was refused, so there is no account. Nothing lawful ` +
        `remains to do — Colombia has no legitimate-interest basis (ADR-0007).`,
    );
    this.name = "RequiredConsentRefusedError";
  }
}

export class PersonNotFoundError extends Error {
  constructor(publicId: string) {
    super(`no Person with public id ${publicId}`);
    this.name = "PersonNotFoundError";
  }
}

export class DisclosureNotSeededError extends Error {
  constructor(slug: string, version: string) {
    super(
      `the ${slug}@${version} disclosure is not in document_versions. Consent cannot be recorded ` +
        `against a document nobody was shown — run \`pnpm --filter @repo/consent seed-documents\`.`,
    );
    this.name = "DisclosureNotSeededError";
  }
}

/**
 * Write one `consents` row per Purpose asked at `/signup`, all four, inside the caller's
 * transaction.
 *
 * **Four rows, not one per tick.** A refused `news` is evidence that the box was there, unticked and
 * separately selectable — which is what D.1377 art. 7's ban on treating silence as consent actually
 * asks us to be able to show. Recording only the grants would leave us unable to prove the difference
 * between a refusal and a box we never rendered.
 *
 * **Call this inside the transaction that writes the `persons` row.** ADR-0007's ordering is the
 * whole design: `persons` plus its consents commit together, *then* Better Auth creates the `users`
 * row. A crash between them leaves personal data with its authorisation, which is recoverable; the
 * other order leaves an email address with no authorisation at all, which is the art. 9 failure this
 * table exists to prevent.
 */
export async function recordSignupConsents(
  db: Db | Tx,
  input: RecordSignupConsentsInput,
): Promise<Consent[]> {
  const now = input.now ?? new Date();

  assertDecisionsAreExactlyTheSignupSet(input.decisions);
  assertRequiredPurposesGranted(input.decisions);

  const [person] = await db
    .select({ id: persons.id })
    .from(persons)
    .where(eq(persons.publicId, input.personPublicId))
    .limit(1);

  if (!person) throw new PersonNotFoundError(input.personPublicId);

  const disclosure = currentDisclosure("signup", now);
  const versionId = await documentVersionId(db, disclosure);
  if (versionId === undefined) {
    throw new DisclosureNotSeededError(disclosure.slug, disclosure.version);
  }

  const key = subjectKey(input.subjectKeySecret, input.email);

  const rows = await db
    .insert(consents)
    .values(
      input.decisions.map((decision) => ({
        personId: person.id,
        subjectKey: key,
        purpose: decision.purpose,
        isGranted: decision.isGranted,
        grantedAt: now,
        documentVersionId: versionId,
      })),
    )
    .returning();

  return rows.map(withoutPrivateColumns);
}

/**
 * Is this Person consented to this Purpose **right now**?
 *
 * Two rules, and the second is the one that is easy to leave out:
 *
 * 1. The **latest** row for the Purpose decides. Consent is append-only, so a revocation is a newer
 *    row refusing it rather than an edit — reading any row but the newest gets the opposite answer.
 * 2. **Re-consent fails closed** (ADR-0007). A grant against a Disclosure older than the Purpose's
 *    `minimumDisclosureVersion` is treated as *not consented*, because D.1377 arts. 5 and 13 require
 *    new authorisation for a changed _finalidad_ and there is a window in which a Person is
 *    consented to the old one and not the new. The feature stops immediately; the interstitial that
 *    asks again is the UI's job, and it never gates `/my-data`.
 *
 * `disclose_contact` is exempt from the second rule — its `minimumDisclosureVersion` is null,
 * because it is granted fresh per Offer and there is never a stale grant to invalidate.
 */
export async function hasConsented(
  db: Db | Tx,
  personPublicId: string,
  purpose: Purpose,
): Promise<boolean> {
  const [latest] = await db
    .select({
      isGranted: consents.isGranted,
      disclosureVersion: documentVersions.version,
    })
    .from(consents)
    .innerJoin(persons, eq(persons.id, consents.personId))
    .innerJoin(documentVersions, eq(documentVersions.id, consents.documentVersionId))
    .where(and(eq(persons.publicId, personPublicId), eq(consents.purpose, purpose)))
    // `granted_at` first, matching `consents_person_id_purpose_granted_at_idx`. `id` breaks the tie
    // for two rows written in the same transaction, where `granted_at` is one injected `now`.
    .orderBy(desc(consents.grantedAt), desc(consents.id))
    .limit(1);

  if (!latest?.isGranted) return false;

  const minimum = PURPOSE_METADATA[purpose].minimumDisclosureVersion;
  // Versions are dated `YYYY-MM-DD`, which sorts lexicographically exactly as it sorts
  // chronologically — the same property `isAdult` leans on in `@repo/people`.
  return minimum === null || latest.disclosureVersion >= minimum;
}

/** Every decision this Person has recorded, newest first. The material an art. 8(b) request wants. */
export async function consentHistory(db: Db | Tx, personPublicId: string): Promise<Consent[]> {
  const rows = await db
    .select({ consent: consents })
    .from(consents)
    .innerJoin(persons, eq(persons.id, consents.personId))
    .where(eq(persons.publicId, personPublicId))
    .orderBy(desc(consents.grantedAt), desc(consents.id));

  return rows.map((row) => withoutPrivateColumns(row.consent));
}

function assertDecisionsAreExactlyTheSignupSet(decisions: readonly ConsentDecision[]): void {
  const decided = new Set(decisions.map((decision) => decision.purpose));

  if (decided.size !== decisions.length) {
    // Count, then keep the ones seen more than once — so the error names the actual duplicate
    // rather than every Purpose in the submission.
    const counts = new Map<string, number>();
    for (const { purpose } of decisions) counts.set(purpose, (counts.get(purpose) ?? 0) + 1);

    const duplicated = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([purpose]) => purpose);

    throw new DuplicateConsentDecisionError(duplicated);
  }

  const missing = SIGNUP_PURPOSES.filter((purpose) => !decided.has(purpose));
  if (missing.length > 0) throw new MissingConsentDecisionError(missing);

  const signup = new Set<string>(SIGNUP_PURPOSES);
  const unexpected = [...decided].filter((purpose) => !signup.has(purpose));
  if (unexpected.length > 0) throw new UnexpectedConsentDecisionError(unexpected);
}

function assertRequiredPurposesGranted(decisions: readonly ConsentDecision[]): void {
  const refused = REQUIRED_SIGNUP_PURPOSES.filter(
    (purpose) => !decisions.some((d) => d.purpose === purpose && d.isGranted),
  );
  if (refused.length > 0) throw new RequiredConsentRefusedError(refused);
}

function withoutPrivateColumns(row: typeof consents.$inferSelect): Consent {
  const {
    id: _id,
    personId: _personId,
    documentVersionId: _documentVersionId,
    subjectKey: _subjectKey,
    ...consent
  } = row;
  return consent;
}
