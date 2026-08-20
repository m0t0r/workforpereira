import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { withRollback } from "@repo/db/testing";

import { readAuthoredDocuments } from "./authoring";
import { contentHash, DOCUMENT_CATALOGUE } from "./documents";
import { DocumentHashMismatchError, seedDocumentVersions } from "./seed";

/**
 * The catalogue and the markdown have to agree, and **nothing else checks that until deploy time.**
 *
 * `seed-documents` runs on the CI runner immediately after `pnpm db:migrate` (ADR-0022), so a
 * catalogue entry naming a file that does not exist would fail the deploy — after the migration has
 * already been applied. Cheaper to fail here.
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
  it("exist for every version the catalogue declares", () => {
    // `readAuthoredDocuments` throws `ENOENT` naming the missing path, which is the whole assertion.
    const documents = readAuthoredDocuments(legalDirectory);
    expect(documents).toHaveLength(DOCUMENT_CATALOGUE.length);
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
    const withMarkers = readAuthoredDocuments(legalDirectory).filter((document) =>
      document.body.includes("[PENDIENTE:"),
    );
    expect(withMarkers).toHaveLength(DOCUMENT_CATALOGUE.length);
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
      if (!first) throw new Error("the catalogue is empty");

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
