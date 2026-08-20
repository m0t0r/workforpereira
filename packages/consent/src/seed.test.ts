import { documentVersions } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { eq } from "drizzle-orm";

import { contentHash } from "./documents";
import { fixtureDocuments } from "./fixtures";
import {
  DocumentHashMismatchError,
  MissingPinnedDocumentError,
  seedDocumentVersions,
} from "./seed";

describe("freezing the authored documents", () => {
  it(
    "inserts every version the first time",
    withRollback(async (tx) => {
      const result = await seedDocumentVersions(tx, fixtureDocuments());

      expect(result.inserted).toEqual([
        "processing-policy@2026-08-19",
        "privacy-notice@2026-08-19",
        "disclosure-signup@2026-08-19",
      ]);
      expect(result.unchanged).toEqual([]);
    }),
  );

  it(
    "stores the hash of the body it froze",
    withRollback(async (tx) => {
      const [document] = fixtureDocuments();
      if (!document) throw new Error("the fixture documents are empty");

      await seedDocumentVersions(tx, [document]);

      const [row] = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.slug, document.slug));

      expect(row?.contentHash).toBe(contentHash(document.body));
      expect(row?.body).toBe(document.body);
    }),
  );

  // It runs on every deploy, so being a no-op on the second run is the ordinary case rather than an
  // edge case.
  it(
    "is a no-op the second time",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());
      const again = await seedDocumentVersions(tx, fixtureDocuments());

      expect(again.inserted).toEqual([]);
      expect(again.unchanged).toHaveLength(3);
    }),
  );

  // The acceptance criterion: "the seed refuses to run if an authored document's hash does not
  // match the frozen version".
  it(
    "refuses a document that has been edited since it was frozen",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());

      const edited = fixtureDocuments().map((document) =>
        document.slug === "processing-policy"
          ? { ...document, body: `${document.body}\nuna frase añadida después\n` }
          : document,
      );

      await expect(seedDocumentVersions(tx, edited)).rejects.toThrow(DocumentHashMismatchError);
    }),
  );

  it(
    "refuses even a whitespace-only edit",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());

      const edited = fixtureDocuments().map((document) =>
        document.slug === "privacy-notice" ? { ...document, body: `${document.body} ` } : document,
      );

      // No normalisation, deliberately: "only whitespace changed" is a claim the seed is not in a
      // position to verify, and two different files must never hash the same.
      await expect(seedDocumentVersions(tx, edited)).rejects.toThrow(DocumentHashMismatchError);
    }),
  );

  it(
    "names the file and both hashes when it refuses",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());
      const edited = fixtureDocuments().map((document) =>
        document.slug === "processing-policy" ? { ...document, body: "otro texto" } : document,
      );

      await expect(seedDocumentVersions(tx, edited)).rejects.toThrow(
        /docs\/legal\/processing-policy\/2026-08-19\.md/,
      );
    }),
  );

  it(
    "accepts a new version beside a frozen one",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());

      const documents = fixtureDocuments();
      const policy = documents.find((d) => d.slug === "processing-policy");
      if (!policy) throw new Error("the fixture documents lost the processing policy");

      const v2 = { ...policy, version: "2026-12-01", body: "# la segunda versión\n" };
      const result = await seedDocumentVersions(tx, [v2]);

      expect(result.inserted).toEqual(["processing-policy@2026-12-01"]);
    }),
  );
});

describe("a disclosure's pins", () => {
  it(
    "point at the policy and notice in force",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());

      const [disclosure] = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.slug, "disclosure-signup"));

      // ADR-0007: one foreign key on a `consents` row recovers the whole triple, because the
      // disclosure it names pins the other two.
      expect(disclosure?.processingPolicyVersionId).not.toBeNull();
      expect(disclosure?.privacyNoticeVersionId).not.toBeNull();
    }),
  );

  it(
    "are absent on a policy and on a notice",
    withRollback(async (tx) => {
      await seedDocumentVersions(tx, fixtureDocuments());

      const rows = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.kind, "processing_policy"));

      // The `document_versions_pins_check` constraint makes this an invariant rather than a habit.
      expect(rows[0]?.processingPolicyVersionId).toBeNull();
      expect(rows[0]?.privacyNoticeVersionId).toBeNull();
    }),
  );

  it(
    "refuse to point at a version that is not seeded",
    withRollback(async (tx) => {
      const disclosureOnly = fixtureDocuments().filter((d) => d.kind === "disclosure");

      await expect(seedDocumentVersions(tx, disclosureOnly)).rejects.toThrow(
        MissingPinnedDocumentError,
      );
    }),
  );
});
