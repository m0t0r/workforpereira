import { createHash } from "node:crypto";

import type { DocumentKind } from "@repo/db/schema";

import type { ConsentSurface } from "./purposes";

/**
 * **What a legal document is, as types; what it says and which version it is, as one markdown file.**
 *
 * ADR-0007 asks for two properties that pull in opposite directions: a document must be pleasant to
 * author, and it must be evidence. D.1377 art. 16 requires retaining the model of every _aviso_ for
 * as long as obligations derived from it endure, and an export in 2029 must render back the exact
 * text shown in 2026.
 *
 * The split that satisfies both:
 *
 * - **The file is the authoring source.** `docs/legal/<slug>/<version>.md`, one file per version,
 *   never edited once seeded, with its own metadata in YAML front matter.
 * - **The row is the evidence.** A `consents` row carries a foreign key to one `document_versions`
 *   row, so the whole triple — what we told them, the policy behind it, the notice beside it — is
 *   recoverable from a single reference.
 * - **The seed is the bridge**, and it fails the deploy on a mismatch, so the two cannot drift.
 *
 * **There is no `DOCUMENT_CATALOGUE` any more**, and its absence is the point. A hand-maintained
 * list in TypeScript beside a directory of files is two places to state the same fact, and the
 * failure it invited was silent in both directions: a file with no entry was never seeded, and an
 * entry with no file threw `ENOENT` at deploy time. Front matter puts the version, its effective
 * date and what it pins **in the file they describe**, where they cannot be forgotten separately.
 *
 * That is an amendment to ADR-0007, which chose a code catalogue for reviewability. The reasoning
 * still holds and front matter satisfies it — a version bump is a reviewed diff either way — but
 * `PURPOSE_METADATA.minimumDisclosureVersion` stays in code, because *that* one is the mechanism by
 * which a changed _finalidad_ invalidates existing consent and it must be type-checked against the
 * Purpose vocabulary.
 */

export interface DocumentPin {
  readonly slug: string;
  readonly version: string;
}

/** A document's own declaration of itself, parsed from its front matter. */
export interface DocumentFrontMatter {
  readonly slug: string;
  readonly kind: DocumentKind;
  /** Dated, so it sorts, and so a Person can cite it. */
  readonly version: string;
  /** ISO 8601. ADR-0007 models the art. 5 notification as a send that must precede this instant. */
  readonly effectiveFrom: string;
  /** A `disclosure` pins the _política_ and the _aviso_ in force when it was published. */
  readonly pins?: {
    readonly processingPolicy: DocumentPin;
    readonly privacyNotice: DocumentPin;
  };
  /** Which consent surface a `disclosure` belongs to. Absent on the other two kinds. */
  readonly surface?: ConsentSurface;
}

/**
 * SHA-256 of the document body, lowercase hex — **the whole of the tamper check**.
 *
 * **Over the body, not the whole file**, and the distinction is deliberate now that front matter
 * exists. The body is the text a person was shown and is what `document_versions.body` stores, so
 * hashing it keeps the column comment literally true: `content_hash` is the SHA-256 of `body`.
 * Front matter is metadata *about* the version and is never displayed, so folding it into the hash
 * would make the evidence hash depend on something that is not evidence.
 *
 * The metadata is not left unguarded by that choice — `seedDocumentVersions` compares the parsed
 * front matter against the frozen row separately, so changing a seeded version's `effectiveFrom` is
 * caught as its own error rather than disguised as a text change.
 *
 * Otherwise deliberately raw: no trimming, no line-ending fix-up. Any of those would make two
 * different bodies hash the same, which is precisely the property this must not have. A
 * whitespace-only edit trips the gate, and that is correct — a seeded version is frozen, and "only
 * whitespace changed" is a claim the seed is not in a position to verify.
 */
export function contentHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}
