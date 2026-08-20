import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { withRollback } from "@repo/db/testing";

import { readAuthoredDocuments } from "./authoring";
import { contentHash } from "./documents";
import { DocumentHashMismatchError, seedDocumentVersions } from "./seed";

/**
 * The real documents have to parse, and **nothing else checks that until deploy time.**
 *
 * `seed-documents` runs on the CI runner immediately after `pnpm db:migrate` (ADR-0022), so a
 * document whose front matter is malformed would fail the deploy — after the migration has already
 * been applied. Cheaper to fail here.
 *
 * **What this suite guards changed with #70.** There is no `DOCUMENT_CATALOGUE` any more: documents
 * are discovered from the directory and describe themselves in front matter, so "an entry naming a
 * file that does not exist" is no longer a state that can be reached. What can still go wrong is a
 * file that parses badly, sits in the wrong place, or loses the disclaimers — which is what is
 * asserted below.
 *
 * This is the one test in the package that reads `docs/legal/` for real. Every other one uses short
 * fixture bodies, so a typo fix in a Spanish sentence does not turn a suite red.
 */

function workspaceRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("no pnpm-workspace.yaml above the test's cwd");
    dir = parent;
  }
}

const legalDirectory = resolve(workspaceRoot(), "docs/legal");

describe("the authored documents", () => {
  it("all parse, and declare themselves consistently with where they sit", () => {
    // `readAuthoredDocuments` throws `InvalidFrontMatterError` or `MisplacedDocumentError` naming the
    // path, so not throwing is most of the assertion.
    const documents = readAuthoredDocuments(legalDirectory);

    // The three v1 documents ADR-0007 requires before anybody can sign up. A fourth is expected the
    // day a surface adds its own disclosure, and this is the line that will say so.
    expect(documents.map((d) => d.slug)).toEqual([
      "privacy-notice",
      "processing-policy",
      "disclosure-signup",
    ]);
  });

  // The seed resolves a disclosure's pins as it goes, so a disclosure sorted ahead of the documents
  // it pins fails with `MissingPinnedDocumentError`. Discovery reads the directory alphabetically,
  // where `disclosure-signup` comes first — so the ordering is done rather than lucky.
  it("put the pinned documents before the disclosures that pin them", () => {
    const kinds = readAuthoredDocuments(legalDirectory).map((d) => d.kind);
    const firstDisclosure = kinds.indexOf("disclosure");

    expect(firstDisclosure).toBeGreaterThan(-1);
    expect(kinds.slice(firstDisclosure).every((k) => k === "disclosure")).toBe(true);
  });

  it("carry the metadata a consent has to point at", () => {
    for (const document of readAuthoredDocuments(legalDirectory)) {
      expect(document.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(document.effectiveFrom).getTime())).toBe(false);
      // A disclosure with no pins would let a consent name our processing with no record of the
      // policy behind it, which is the one thing the single foreign key exists to prevent.
      if (document.kind === "disclosure") {
        expect(document.pins?.processingPolicy.slug).toBe("processing-policy");
        expect(document.pins?.privacyNotice.slug).toBe("privacy-notice");
        expect(document.surface).toBeDefined();
      }
    }
  });

  // Front matter is metadata, never text the Titular reads. If it ever reached `body` it would be
  // rendered on `/legal/*` and frozen into the evidence as though it were part of the document.
  it("keep front matter out of the body", () => {
    for (const document of readAuthoredDocuments(legalDirectory)) {
      expect(document.body).not.toContain("effectiveFrom:");
      expect(document.body.trimStart().startsWith("---")).toBe(false);
    }
  });

  it("are not empty", () => {
    for (const document of readAuthoredDocuments(legalDirectory)) {
      expect(document.body.length).toBeGreaterThan(500);
    }
  });

  it("each identify the Responsable, in Spanish", () => {
    for (const document of readAuthoredDocuments(legalDirectory)) {
      // Two things in one assertion, and both are load-bearing. **All three documents must name the
      // Responsable** — D.1377 art. 13(1) for the _política_, arts. 14–15 for the _aviso_, and
      // L.1581 art. 12 for a disclosure, which has to say who is asking. And they are in **Spanish**,
      // which is the one place ADR-0001 requires it rather than merely permitting it: these are read
      // by a Titular and by the SIC, and a document that drifted into English would satisfy every
      // other check in this repository.
      expect(document.body).toMatch(/Responsable del tratamiento/);
    }
  });

  it("still carry the markers that say counsel has not seen them", () => {
    // `docs/legal/README.md` states plainly that no version here has been reviewed by a lawyer. This
    // fails the day the last `[PENDIENTE: …]` is resolved — at which point the right move is to
    // delete this test *and* the warning in the README, together, in one reviewed commit.
    const documents = readAuthoredDocuments(legalDirectory);
    const withMarkers = documents.filter((document) => document.body.includes("[PENDIENTE:"));
    expect(withMarkers).toHaveLength(documents.length);
  });

  it(
    "seed and verify against themselves",
    withRollback(async (tx) => {
      const documents = readAuthoredDocuments(legalDirectory);

      const first = await seedDocumentVersions(tx, documents);
      expect(first.inserted).toHaveLength(documents.length);

      // The deploy runs this on every release. Being a no-op the second time is the ordinary case.
      const second = await seedDocumentVersions(tx, documents);
      expect(second.unchanged).toHaveLength(documents.length);
    }),
  );

  it(
    "refuse to reseed once a byte has changed",
    withRollback(async (tx) => {
      const documents = readAuthoredDocuments(legalDirectory);
      await seedDocumentVersions(tx, documents);

      const [first, ...rest] = documents;
      if (!first) throw new Error("no authored documents were discovered");

      await expect(
        seedDocumentVersions(tx, [{ ...first, body: `${first.body}\n` }, ...rest]),
        // On the type rather than the sentence: the class is the contract (ADR-0001, amended).
      ).rejects.toThrow(DocumentHashMismatchError);
    }),
  );

  it("hash to something stable", () => {
    const documents = readAuthoredDocuments(legalDirectory);
    for (const document of documents) {
      expect(contentHash(document.body)).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
