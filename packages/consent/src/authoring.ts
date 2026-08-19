import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DOCUMENT_CATALOGUE, type CataloguedDocument } from "./documents";
import type { AuthoredDocument } from "./seed";

/**
 * Reads `docs/legal/<slug>/<version>.md` for every entry in the catalogue.
 *
 * **Separated from `seedDocumentVersions`, and the split is the same one `@repo/db` makes for
 * `pnpm db:check`**: the rules are a module and the filesystem is a shell over them, because only
 * the shell is untestable. `seedDocumentVersions` takes documents and knows nothing about paths, so
 * every rule it enforces is exercised at the seam ADR-0017 allows.
 *
 * This function is reached from `scripts/seed-documents.ts` and from the route handlers that render
 * `/legal/*`. It is **not** how a Person's frozen copy is retrieved — that comes from
 * `document_versions`, which is the evidence; this reads the working copy in the repository.
 */
export function readAuthoredDocuments(
  legalDirectory: string,
  catalogue: readonly CataloguedDocument[] = DOCUMENT_CATALOGUE,
): AuthoredDocument[] {
  return catalogue.map((document) => ({
    ...document,
    // `utf8` and nothing else: the hash is over the raw bytes of the file, with no trimming and no
    // line-ending normalisation, because two different files must never hash the same.
    body: readFileSync(join(legalDirectory, document.slug, `${document.version}.md`), "utf8"),
  }));
}
