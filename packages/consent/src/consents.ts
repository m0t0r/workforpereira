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
  /** Every signup box, in any order. A missing one is an error, never an inferred refusal. */
  readonly decisions: readonly ConsentDecision[];
  readonly now?: Date;
}

/**
 * A signup Purpose arrived with no answer at all.
 *
 * Not the same as a refusal, and not treatable as one: a stored refusal is evidence that the box
 * was rendered and separately selectable, which is what D.1377 art. 7's ban on inferring consent
 * from silence asks us to be able to show. Inferring the opposite from silence is the same mistake
 * in the other direction.
 */
export class MissingConsentDecisionError extends Error {
  readonly code = "CONSENT_DECISION_MISSING";

  constructor(readonly missing: readonly string[]) {
    super(`no consent decision submitted for: ${missing.join(", ")}`);
    this.name = "MissingConsentDecisionError";
  }
}

/**
 * A Purpose that is not asked at `/signup` arrived in a signup submission.
 *
 * `publish`, `disclose_contact` and `photo` are consented in context, at the surface that needs
 * them (ADR-0007), so recording them here would date the evidence to a screen that never showed
 * them.
 */
export class UnexpectedConsentDecisionError extends Error {
  readonly code = "CONSENT_PURPOSE_NOT_AT_SIGNUP";

  constructor(readonly unexpected: readonly string[]) {
    super(`not a signup purpose: ${unexpected.join(", ")}`);
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
  readonly code = "CONSENT_DECISION_DUPLICATED";

  constructor(readonly duplicated: readonly string[]) {
    super(`more than one consent decision submitted for: ${duplicated.join(", ")}`);
    this.name = "DuplicateConsentDecisionError";
  }
}

/**
 * A required Purpose was refused, so nothing is written and there is no account.
 *
 * Colombia has no legitimate-interest basis (ADR-0007): without the grant there is no lawful
 * processing left to fall back on, which is why this is a refusal rather than a degraded signup.
 */
export class RequiredConsentRefusedError extends Error {
  readonly code = "CONSENT_REQUIRED_REFUSED";

  constructor(readonly refused: readonly string[]) {
    super(`required consent refused for: ${refused.join(", ")}`);
    this.name = "RequiredConsentRefusedError";
  }
}

export class PersonNotFoundError extends Error {
  readonly code = "PERSON_NOT_FOUND";

  constructor(publicId: string) {
    super(`no Person with public id ${publicId}`);
    this.name = "PersonNotFoundError";
  }
}

/**
 * The disclosure this surface consents against has never been frozen into `document_versions`.
 *
 * Consent cannot be recorded against a document nobody was shown, so this is a refusal rather than
 * a null pin. Operationally it means the deploy skipped
 * `pnpm --filter @repo/consent seed-documents`, which runs immediately after the migration.
 */
export class DisclosureNotSeededError extends Error {
  readonly code = "DISCLOSURE_NOT_SEEDED";

  constructor(
    readonly slug: string,
    readonly version: string,
  ) {
    super(`no document_versions row for disclosure ${slug}@${version}`);
    this.name = "DisclosureNotSeededError";
  }
}

/**
 * Write one `consents` row per Purpose asked at `/signup`, all of them, inside the caller's
 * transaction.
 *
 * **One row per Purpose, not one per tick.** The rule was written for a refused `news`: a stored
 * refusal is evidence that the box was there, unticked and separately selectable, which is what
 * D.1377 art. 7's ban on treating silence as consent asks us to be able to show.
 *
 * **`news` left the vocabulary with #70, and that changes what this function can produce.** Every
 * signup Purpose is now required, and `assertRequiredPurposesGranted` runs *before* the insert — so
 * a refusal at this surface throws `RequiredConsentRefusedError` and **writes nothing at all**. No
 * `consents` row written by this function is ever `is_granted = false` today, and pretending
 * otherwise in a comment would be claiming a property the code does not have.
 *
 * The rule is still the rule, in two places it still reaches. **A revocation** is a newer refusing
 * row (`hasConsented` reads the latest, and `consentHistory` returns every one of them), and **the
 * next optional Purpose added to this surface** gets its refusal stored without anyone re-deriving
 * why. What the evidence rests on until then is the `decisions` array itself: the caller must submit
 * a decision for every signup Purpose or be refused, so "the box was rendered" is enforced at the
 * boundary even when the outcome is a signup that does not complete.
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
