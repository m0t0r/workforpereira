import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

import { DOCUMENT_KINDS } from "@repo/db/schema";

import type { DocumentFrontMatter } from "./documents";
import { CONSENT_SURFACES } from "./purposes";
import type { AuthoredDocument } from "./seed";

/**
 * Discovers and parses every authored legal document under `docs/legal/<slug>/<version>.md`.
 *
 * **Discovery rather than a catalogue.** Every `.md` file in a slug directory is a document version,
 * and its front matter says which one. Nothing has to be registered anywhere, so a file cannot be
 * authored and then silently never seeded.
 *
 * **Separated from `seedDocumentVersions`, and the split is the same one `@repo/db` makes for
 * `pnpm db:check`**: the rules are a module and the filesystem is a shell over them, because only
 * the shell is untestable. `seedDocumentVersions` takes documents and knows nothing about paths, so
 * every rule it enforces is exercised at the seam ADR-0017 allows.
 *
 * **This is a build-time and deploy-time function, never a request-time one.** It is reached from
 * `scripts/seed-documents.ts` and from `apps/web`'s `/legal/*` pages, which prerender. That is not a
 * preference: `next.config.ts` sets `output: "standalone"`, so the runtime image carries only the
 * modules the build traced and `docs/legal/**` is **not** in it. A dynamic read here would work in
 * development and 500 in production.
 *
 * It is also why nothing on the request path may import it — `@repo/consent`'s barrel re-exports it,
 * so importing the barrel from a client component drags `node:fs` into the browser bundle and fails
 * the build outright.
 */
export function readAuthoredDocuments(legalDirectory: string): AuthoredDocument[] {
  const documents: AuthoredDocument[] = [];

  for (const slug of directoriesIn(legalDirectory)) {
    for (const file of markdownIn(join(legalDirectory, slug))) {
      const path = join(legalDirectory, slug, file);
      // `utf8` and nothing else. The hash is over the raw bytes of the body with no normalisation,
      // because two different bodies must never hash the same.
      const parsed = matter(readFileSync(path, "utf8"));
      const front = assertFrontMatter(parsed.data, path);

      // The path is the second statement of the same fact, so it is checked rather than trusted. A
      // file whose front matter disagrees with where it sits would be seeded under one identity and
      // found under another.
      const expected = `${front.version}.md`;
      if (front.slug !== slug || file !== expected) {
        throw new MisplacedDocumentError(path, front.slug, expected);
      }

      // **The one leading newline `gray-matter` leaves behind is removed, and nothing else is.**
      // It splits at the closing `---` and hands back content beginning `"\n# Título…"`, so without
      // this the frozen evidence body starts with a character that is a parser artifact and matches
      // no file in the repository byte-for-byte. That is not the "no normalisation" rule being
      // broken — that rule is about never letting two different bodies hash the same, and undoing
      // exactly one artifact of our own parse cannot do that.
      documents.push({ ...front, body: parsed.content.replace(/^\r?\n/, "") });
    }
  }

  // **Policies and notices before disclosures.** A disclosure pins the two and `seedDocumentVersions`
  // resolves those pins as it goes, so the pinned versions have to be inserted first. Sorting here
  // rather than asking the caller to order a directory listing correctly.
  return documents.sort((a, b) => rank(a) - rank(b));
}

const rank = (document: AuthoredDocument): number => (document.kind === "disclosure" ? 1 : 0);

/**
 * A document's front matter and its path disagree about which document it is.
 *
 * A document is addressed by `(slug, version)` and the path states both, so the two have to agree:
 * either move the file to `docs/legal/<slug>/<version>.md` or fix its front matter.
 */
export class MisplacedDocumentError extends Error {
  readonly code = "DOCUMENT_MISPLACED";

  constructor(
    readonly path: string,
    readonly declaredSlug: string,
    readonly expectedFile: string,
  ) {
    super(
      `${path} declares slug "${declaredSlug}" and version file "${expectedFile}", expected it at ` +
        `docs/legal/${declaredSlug}/${expectedFile}`,
    );
    this.name = "MisplacedDocumentError";
  }
}

/**
 * A legal document's YAML front matter is missing or malformed.
 *
 * Every legal document declares `kind`, `slug`, `version` and `effectiveFrom`; a disclosure also
 * declares `surface` and `pins`.
 */
export class InvalidFrontMatterError extends Error {
  readonly code = "DOCUMENT_FRONT_MATTER_INVALID";

  constructor(
    readonly path: string,
    what: string,
  ) {
    super(`${path} has invalid front matter: ${what}`);
    this.name = "InvalidFrontMatterError";
  }
}

function assertFrontMatter(data: unknown, path: string): DocumentFrontMatter {
  if (typeof data !== "object" || data === null) {
    throw new InvalidFrontMatterError(path, "there is none");
  }
  const front = data as Record<string, unknown>;

  for (const key of ["kind", "slug", "version", "effectiveFrom"]) {
    if (typeof front[key] !== "string") {
      throw new InvalidFrontMatterError(path, `${key} is missing or is not a string`);
    }
  }

  /**
   * **Checked against the vocabulary, not merely against `string`** — and the capitalisation case is
   * why this matters more than tidiness. `kind: Disclosure` is a string, so a `typeof` check passes
   * it; then `front["kind"] === "disclosure"` is *false*, the `pins` and `surface` requirements below
   * are skipped in silence, and the document is seeded as a disclosure that pins nothing. A typo like
   * `privacy-notice` for `privacy_notice` fails later and worse — as a Postgres enum violation
   * mid-transaction, on the deploy, after `db:migrate` has already run.
   */
  if (!(DOCUMENT_KINDS as readonly string[]).includes(front["kind"] as string)) {
    throw new InvalidFrontMatterError(
      path,
      `kind "${String(front["kind"])}" is not one of ${DOCUMENT_KINDS.join(", ")}`,
    );
  }

  const effectiveFrom = front["effectiveFrom"] as string;
  if (Number.isNaN(new Date(effectiveFrom).getTime())) {
    throw new InvalidFrontMatterError(path, `effectiveFrom "${effectiveFrom}" is not a date`);
  }

  if (front["kind"] === "disclosure") {
    // A disclosure with no pins would let a consent point at a description of our processing with no
    // record of the policy behind it, which is the one thing the single foreign key exists to avoid.
    const pins = front["pins"];
    if (typeof pins !== "object" || pins === null) {
      throw new InvalidFrontMatterError(path, "a disclosure must declare pins");
    }
    const { processingPolicy, privacyNotice } = pins as Record<string, unknown>;
    for (const [name, pin] of [
      ["processingPolicy", processingPolicy],
      ["privacyNotice", privacyNotice],
    ] as const) {
      if (
        typeof pin !== "object" ||
        pin === null ||
        typeof (pin as Record<string, unknown>)["slug"] !== "string" ||
        typeof (pin as Record<string, unknown>)["version"] !== "string"
      ) {
        throw new InvalidFrontMatterError(path, `pins.${name} needs a slug and a version`);
      }
    }
    const surface = front["surface"];
    if (!(CONSENT_SURFACES as readonly string[]).includes(surface as string)) {
      throw new InvalidFrontMatterError(
        path,
        `surface "${String(surface)}" is not one of ${CONSENT_SURFACES.join(", ")}`,
      );
    }

    // The slug states the surface a second time — `disclosure-<surface>` is the convention
    // `currentDisclosure` resolves by — so the two are checked against each other rather than one
    // being trusted. A disclosure whose slug and surface disagree is seeded under one identity and
    // looked up under the other, which is a consent pointing at nothing.
    if (front["slug"] !== `disclosure-${String(surface)}`) {
      throw new InvalidFrontMatterError(
        path,
        `a disclosure for the ${String(surface)} surface must have slug ` +
          `"disclosure-${String(surface)}", not "${String(front["slug"])}"`,
      );
    }
  }

  return front as unknown as DocumentFrontMatter;
}

const directoriesIn = (path: string): string[] =>
  readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isDirectory())
    .sort();

const markdownIn = (path: string): string[] =>
  readdirSync(path)
    .filter((entry) => entry.endsWith(".md"))
    .sort();
