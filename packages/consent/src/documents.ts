import { createHash } from "node:crypto";

import type { DocumentKind } from "@repo/db/schema";

import type { ConsentSurface } from "./purposes";

/**
 * **What documents exist, as code; what they say, as markdown.** ADR-0007 wants both halves and
 * neither alone.
 *
 * D.1377 art. 16 requires retaining the model of every _aviso_ for as long as obligations derived
 * from it endure, and an export in 2029 must render back the exact text shown in 2026. Markdown in a
 * repo is pleasant to author and useless as evidence; a database row is evidence and miserable to
 * author. So the text is authored one file per version under `docs/legal/<slug>/<version>.md` and
 * **never edited once seeded**, this file declares which versions exist and what they pin, and the
 * content hash is what binds the two together at deploy time.
 *
 * A new version is therefore three things in one commit: a new markdown file, a new entry here, and
 * — for a Purpose whose _finalidad_ changed — a bumped `minimumDisclosureVersion` in `purposes.ts`.
 * That is exactly the reviewability ADR-0007 asked for when it refused to put this in a table.
 */

export interface DocumentPin {
  readonly slug: string;
  readonly version: string;
}

export interface CataloguedDocument {
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

/** The first version of everything, seeded from nothing. */
const V1 = "2026-08-19";
const V1_EFFECTIVE_FROM = "2026-08-19T00:00:00.000Z";

const PROCESSING_POLICY_V1: DocumentPin = { slug: "processing-policy", version: V1 };
const PRIVACY_NOTICE_V1: DocumentPin = { slug: "privacy-notice", version: V1 };

/**
 * Every legal document version this codebase knows about, oldest first within a slug.
 *
 * **Only `disclosure-signup` is here**, and the omission of `disclosure-publish`,
 * `disclosure-offer-send`, `disclosure-offer-accept` and `disclosure-photo` is deliberate rather
 * than incomplete: each lands with the ticket that builds its surface, because a Disclosure has to
 * describe a thing that exists. Seeding one now would freeze into the evidence table a description
 * of a feature nobody can use.
 */
export const DOCUMENT_CATALOGUE: readonly CataloguedDocument[] = [
  {
    slug: "processing-policy",
    kind: "processing_policy",
    version: V1,
    effectiveFrom: V1_EFFECTIVE_FROM,
  },
  { slug: "privacy-notice", kind: "privacy_notice", version: V1, effectiveFrom: V1_EFFECTIVE_FROM },
  {
    slug: "disclosure-signup",
    kind: "disclosure",
    version: V1,
    effectiveFrom: V1_EFFECTIVE_FROM,
    surface: "signup",
    pins: { processingPolicy: PROCESSING_POLICY_V1, privacyNotice: PRIVACY_NOTICE_V1 },
  },
];

/**
 * The Disclosure a `/signup` consent points at, as a `(slug, version)` pair.
 *
 * Derived by taking the **newest effective version** rather than being written down a second time,
 * so adding a v2 to the catalogue moves the form without anyone remembering to move a constant.
 */
export function currentDisclosure(
  surface: ConsentSurface,
  at: Date = new Date(),
): CataloguedDocument {
  const candidates = DOCUMENT_CATALOGUE.filter(
    (document) =>
      document.kind === "disclosure" &&
      document.surface === surface &&
      new Date(document.effectiveFrom) <= at,
  );

  const newest = candidates.at(-1);
  if (!newest) {
    throw new Error(
      `no disclosure is in force for the ${surface} surface at ${at.toISOString()}. Either the ` +
        `catalogue is missing an entry or its effectiveFrom is in the future.`,
    );
  }
  return newest;
}

/**
 * SHA-256 of the document body, lowercase hex — **the whole of the tamper check**.
 *
 * Deliberately the raw bytes of the file with no normalisation: no trimming, no line-ending fix-up,
 * no front-matter stripping. Any of those would make two different files hash the same, which is
 * precisely the property this must not have. It also means a whitespace-only edit trips the gate,
 * and that is correct — a seeded version is frozen, and "only whitespace changed" is a claim the
 * seed is not in a position to verify.
 */
export function contentHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}
