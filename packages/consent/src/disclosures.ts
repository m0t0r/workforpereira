import type { Db, Tx } from "@repo/db";
import { documentVersions } from "@repo/db/schema";
import { and, desc, eq, lte } from "drizzle-orm";

import type { ConsentSurface } from "./purposes";

/**
 * Which Disclosure a consent recorded **now** should point at, resolved from the database.
 *
 * **It reads the frozen rows rather than a catalogue, and that is the change #70 made.** The
 * previous version answered from `DOCUMENT_CATALOGUE`, a hand-maintained list in TypeScript, and
 * then looked the row up separately — two sources for one fact, with a window in which the catalogue
 * named a version the seed had not frozen. Now the row *is* the answer, so a consent can only ever
 * point at a document that actually exists.
 *
 * It also takes `node:fs` off the request path entirely. The catalogue lived beside
 * `readAuthoredDocuments`, so resolving a disclosure used to pull the module that reads
 * `docs/legal/**` — which cannot work in the deployed image at all (`output: "standalone"` does not
 * carry that directory) and breaks `next build` outright if a client component touches the barrel.
 *
 * **The slug convention is the surface.** `disclosure-signup`, `disclosure-publish`, and so on — the
 * same convention the front matter declares and the seed writes, so there is no `surface` column to
 * keep in step with it.
 */
export function disclosureSlug(surface: ConsentSurface): string {
  return `disclosure-${surface}`;
}

export interface CurrentDisclosure {
  readonly id: bigint;
  readonly slug: string;
  readonly version: string;
}

/**
 * The newest Disclosure **in force** for a surface at `at`, or `undefined` if none is.
 *
 * **Selected on `effective_from`, never by taking the newest row.** Which Disclosure a person was
 * shown is the art. 12 artefact, and "the last one somebody seeded" is a different claim that
 * happens to agree today. They diverge the first time a version is seeded ahead of its effective
 * date — which is the normal case, since ADR-0007 requires the art. 5 notification to precede that
 * instant — and the divergence would record consent against a document nobody had been shown.
 */
export async function currentDisclosure(
  db: Db | Tx,
  surface: ConsentSurface,
  at: Date = new Date(),
): Promise<CurrentDisclosure | undefined> {
  const [row] = await db
    .select({
      id: documentVersions.id,
      slug: documentVersions.slug,
      version: documentVersions.version,
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.slug, disclosureSlug(surface)),
        lte(documentVersions.effectiveFrom, at),
      ),
    )
    // `id` breaks the tie for two versions sharing an `effective_from`, which the schema permits and
    // a same-day correction would produce. Without it the winner is whatever the planner returns.
    .orderBy(desc(documentVersions.effectiveFrom), desc(documentVersions.id))
    .limit(1);

  return row;
}
