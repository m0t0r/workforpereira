import type { Db, Tx } from "@repo/db";
import { documentVersions } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";

import { contentHash, type DocumentFrontMatter, type DocumentPin } from "./documents";

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

/** An authored document: its front matter plus the body of its markdown file. */
export interface AuthoredDocument extends DocumentFrontMatter {
  readonly body: string;
}

/**
 * The authored markdown has drifted from the version already frozen in `document_versions`.
 *
 * A seeded version is evidence and is never edited (ADR-0007, D.1377 art. 16). When the text has to
 * change, author a new version file, add it to `DOCUMENT_CATALOGUE`, and — where a _finalidad_
 * changed — bump that Purpose's `minimumDisclosureVersion` in the same commit.
 */
export class DocumentHashMismatchError extends Error {
  readonly code = "DOCUMENT_HASH_MISMATCH";

  constructor(
    readonly slug: string,
    readonly version: string,
    readonly frozen: string,
    readonly authored: string,
  ) {
    super(
      `docs/legal/${slug}/${version}.md does not match the frozen document_versions row ` +
        `(frozen ${frozen}, authored ${authored})`,
    );
    this.name = "DocumentHashMismatchError";
  }
}

/**
 * A seeded version's **front matter** changed, where its body did not.
 *
 * Its own error rather than being folded into the hash check, because it is a different mistake with
 * a different fix. `contentHash` covers the body alone — deliberately, so that the column comment
 * *"SHA-256 of `body`"* stays literally true — which would otherwise leave `effectiveFrom` and
 * `kind` editable in place on a frozen version with nothing noticing. `effective_from` in particular
 * is the instant ADR-0007 requires the art. 5 notification to precede, so moving it after the fact
 * rewrites a date somebody may have to defend. A seeded version's metadata is as frozen as its
 * text: author a new version rather than editing this one.
 */
export class DocumentMetadataMismatchError extends Error {
  readonly code = "DOCUMENT_METADATA_MISMATCH";

  constructor(
    readonly slug: string,
    readonly version: string,
    readonly field: string,
    readonly frozen: string,
    readonly authored: string,
  ) {
    super(
      `docs/legal/${slug}/${version}.md declares ${field} "${authored}", frozen ` +
        `document_versions row has "${frozen}"`,
    );
    this.name = "DocumentMetadataMismatchError";
  }
}

/**
 * A disclosure names a document version that is not seeded yet.
 *
 * The _política_ and the _aviso_ have to exist before a disclosure can pin them, and
 * `readAuthoredDocuments` sorts them first for exactly that reason.
 */
export class MissingPinnedDocumentError extends Error {
  readonly code = "DOCUMENT_PIN_NOT_SEEDED";

  constructor(slug: string, version: string, pin: DocumentPin) {
    super(`disclosure ${slug}@${version} pins ${pin.slug}@${pin.version}, which is not seeded`);
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
      .select({
        contentHash: documentVersions.contentHash,
        kind: documentVersions.kind,
        effectiveFrom: documentVersions.effectiveFrom,
        processingPolicyVersionId: documentVersions.processingPolicyVersionId,
        privacyNoticeVersionId: documentVersions.privacyNoticeVersionId,
      })
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

      // The metadata half of the same rule. Checked after the hash so that an edit touching both is
      // reported as the text change it primarily is.
      if (frozen.kind !== document.kind) {
        throw new DocumentMetadataMismatchError(
          document.slug,
          document.version,
          "kind",
          frozen.kind,
          document.kind,
        );
      }
      const authoredEffectiveFrom = new Date(document.effectiveFrom);
      if (frozen.effectiveFrom.getTime() !== authoredEffectiveFrom.getTime()) {
        throw new DocumentMetadataMismatchError(
          document.slug,
          document.version,
          "effectiveFrom",
          frozen.effectiveFrom.toISOString(),
          authoredEffectiveFrom.toISOString(),
        );
      }

      /**
       * **The pins are frozen too, and this is the check that makes `docs/legal/README.md` honest**
       * when it says *"the front matter is as frozen as the text"*.
       *
       * Without it, editing a seeded disclosure's `pins` is accepted in silence: the branch above
       * returns early and the pin columns are never re-resolved, so the file would claim to pin
       * `processing-policy@2027-01-01` while the frozen row still points at the 2026 version. **The
       * row is the evidence**, so the file would be describing a document nobody was shown.
       */
      if (document.pins) {
        for (const [field, pin, frozenId] of [
          [
            "pins.processingPolicy",
            document.pins.processingPolicy,
            frozen.processingPolicyVersionId,
          ],
          ["pins.privacyNotice", document.pins.privacyNotice, frozen.privacyNoticeVersionId],
        ] as const) {
          const authoredId = await documentVersionId(db, pin);
          if (authoredId === undefined || frozenId !== authoredId) {
            throw new DocumentMetadataMismatchError(
              document.slug,
              document.version,
              field,
              `document_versions.id ${String(frozenId)}`,
              `${pin.slug}@${pin.version}`,
            );
          }
        }
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
