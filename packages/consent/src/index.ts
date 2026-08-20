/**
 * `@repo/consent` — tier 3 of ADR-0006's DAG. `consents` rows, the Purpose vocabulary, and the
 * versioned documents a consent points at.
 *
 * **This entry point is the seam.** ADR-0006's `exports` map admits exactly this file, and ADR-0017
 * allows a test at a function exported from here and nowhere else inside the package.
 *
 * Four things here are correctness rather than style:
 *
 * - **A refusal is recorded as deliberately as a grant.** One row per signup Purpose leaves
 *   `/signup`, not one per ticked box — the refusal is the evidence that the box was rendered, unticked and separately
 *   selectable, which is what D.1377 art. 7 actually asks us to be able to show.
 * - **Purpose metadata is code, not rows** (ADR-0007). Bumping a required disclosure version
 *   invalidates every existing consent for that Purpose, so it must be a reviewable, revertable
 *   commit rather than an `UPDATE` somebody can run against production.
 * - **Re-consent fails closed.** A grant against a Disclosure older than the Purpose's minimum is
 *   *not* consent, and the feature stops immediately.
 * - **The evidence outlives its subject.** `consents.person_id` is nullable and nulled at erasure;
 *   `subject_key` is what a Titular's dispute finds the row by (ADR-0021), and it never leaves this
 *   module on a public type.
 */

export {
  consentHistory,
  DisclosureNotSeededError,
  DuplicateConsentDecisionError,
  hasConsented,
  MissingConsentDecisionError,
  PersonNotFoundError,
  recordSignupConsents,
  RequiredConsentRefusedError,
  UnexpectedConsentDecisionError,
  type Consent,
  type ConsentDecision,
  type RecordSignupConsentsInput,
} from "./consents";

export { readAuthoredDocuments } from "./authoring";

export {
  contentHash,
  currentDisclosure,
  DOCUMENT_CATALOGUE,
  type CataloguedDocument,
  type DocumentPin,
} from "./documents";

export { abandonedSignups, unlinkedUsers, usersWithoutPrecedingConsent } from "./evidence";

export {
  CONSENT_SURFACES,
  PURPOSE_METADATA,
  purposesForSurface,
  REQUIREMENTS,
  REQUIRED_SIGNUP_PURPOSES,
  SIGNUP_PURPOSES,
  type ConsentSurface,
  type PurposeMetadata,
  type Requirement,
} from "./purposes";

export {
  documentVersionId,
  DocumentHashMismatchError,
  MissingPinnedDocumentError,
  seedDocumentVersions,
  type AuthoredDocument,
  type SeedResult,
} from "./seed";

export { subjectKey, subjectKeyMatches, WeakSubjectKeySecretError } from "./subject-key";
