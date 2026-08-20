import type { Db, Tx } from "@repo/db";
import { documentVersions } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";

import { contentHash, type CataloguedDocument, type DocumentPin } from "./documents";

/**
 * The hash-checked seed. **It fails the deploy rather than the dispute.**
 *
 * ADR-0007's rule is that an authored file is never edited once seeded, and a rule nobody can break
 * accidentally is worth more than one everybody remembers. So this compares each authored file
 * against the version already frozen in `document_versions` and refuses to continue on a mismatch —
 * at `migrate` time, in CI, before the image is deployed.
 *
 * **Idempotent by design**, because it runs on every deploy: an unchanged document is a no-op, and
 * a new version is an insert. Nothing here ever updates a row.
 */

/** An authored document: its catalogue entry plus the bytes of its markdown file. */
export interface AuthoredDocument extends CataloguedDocument {
  readonly body: string;
}

export class DocumentHashMismatchError extends Error {
  constructor(
    readonly slug: string,
    readonly version: string,
    readonly frozen: string,
    readonly authored: string,
  ) {
    super(
      `docs/legal/${slug}/${version}.md no longer matches the version frozen in ` +
        `document_versions.\n` +
        `  frozen:   ${frozen}\n` +
        `  authored: ${authored}\n` +
        `A seeded version is evidence and is never edited (ADR-0007, D.1377 art. 16). If the text ` +
        `has to change, author a new version file, add it to DOCUMENT_CATALOGUE, and — where a ` +
        `_finalidad_ changed — bump that Purpose's minimumDisclosureVersion in the same commit.`,
    );
    this.name = "DocumentHashMismatchError";
  }
}

export class MissingPinnedDocumentError extends Error {
  constructor(slug: string, version: string, pin: DocumentPin) {
    super(
      `disclosure ${slug}@${version} pins ${pin.slug}@${pin.version}, which is not seeded. The ` +
        `_política_ and the _aviso_ have to exist before a disclosure can pin them — order the ` +
        `catalogue so they come first.`,
    );
    this.name = "MissingPinnedDocumentError";
  }
}

export interface SeedResult {
  readonly inserted: string[];
  readonly unchanged: string[];
}

/**
 * Freeze every authored document that is not already frozen, and verify every one that is.
 *
 * **Takes the documents rather than reading them**, so it is a module function at the seam ADR-0017
 * allows and the filesystem stays in `scripts/seed-documents.ts` — the same split `@repo/db` uses
 * for `pnpm db:check`, where the rules are a module and the CLI is a shell over them because only
 * the CLI is untestable.
 *
 * **One transaction, all documents.** A disclosure pinning a _política_ inserted moments earlier in
 * the same run has to see it, and a run that fails half way through must not leave a disclosure
 * pinning a version that a later failure rolled back.
 */
export async function seedDocumentVersions(
  db: Db | Tx,
  documents: readonly AuthoredDocument[],
): Promise<SeedResult> {
  const inserted: string[] = [];
  const unchanged: string[] = [];

  for (const document of documents) {
    const label = `${document.slug}@${document.version}`;
    const authoredHash = contentHash(document.body);

    const [frozen] = await db
      .select({ contentHash: documentVersions.contentHash })
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.slug, document.slug),
          eq(documentVersions.version, document.version),
        ),
      )
      .limit(1);

    if (frozen) {
      if (frozen.contentHash !== authoredHash) {
        throw new DocumentHashMismatchError(
          document.slug,
          document.version,
          frozen.contentHash,
          authoredHash,
        );
      }
      unchanged.push(label);
      continue;
    }

    await db.insert(documentVersions).values({
      kind: document.kind,
      slug: document.slug,
      version: document.version,
      effectiveFrom: new Date(document.effectiveFrom),
      body: document.body,
      contentHash: authoredHash,
      processingPolicyVersionId: document.pins
        ? await requirePin(db, document, document.pins.processingPolicy)
        : null,
      privacyNoticeVersionId: document.pins
        ? await requirePin(db, document, document.pins.privacyNotice)
        : null,
    });

    inserted.push(label);
  }

  return { inserted, unchanged };
}

/** The id of a pinned version, or a refusal naming both sides — never a silent null. */
async function requirePin(
  db: Db | Tx,
  document: AuthoredDocument,
  pin: DocumentPin,
): Promise<bigint> {
  const id = await documentVersionId(db, pin);
  if (id === undefined) throw new MissingPinnedDocumentError(document.slug, document.version, pin);
  return id;
}

/**
 * The `document_versions.id` a `consents` row points at, for a `(slug, version)` pair.
 *
 * Exported because writing a consent needs it and nothing else in this package should be resolving
 * document ids by hand.
 */
export async function documentVersionId(
  db: Db | Tx,
  pin: DocumentPin,
): Promise<bigint | undefined> {
  const [row] = await db
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(and(eq(documentVersions.slug, pin.slug), eq(documentVersions.version, pin.version)))
    .limit(1);

  return row?.id;
}
