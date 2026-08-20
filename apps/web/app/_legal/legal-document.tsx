import { readAuthoredDocuments } from "@repo/consent";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Container } from "../_landing/container";
import { SiteFooter } from "../_landing/site-footer";
import { SiteHeader } from "../_landing/site-header";

/**
 * Renders a legal document from **the authored markdown file**, at build time.
 *
 * **Why the file and not the frozen row.** `document_versions` is the evidence: a `consents` row
 * carries a foreign key to the exact version a Person was shown, and D.1377 art. 16 requires that
 * text to be producible years later. But that is a question about *the past* — "what did I agree to
 * in 2026" — and it belongs to `/my-data`, which will look a version up by the id on the consent row.
 *
 * This page answers a different question: *what is the policy now*. The file is the authoring source
 * (ADR-0007: "author as one file per version… never edited once seeded"), and the two cannot
 * disagree in a deployed environment, because `seed-documents` runs on every deploy immediately
 * after `pnpm db:migrate` and **fails the deploy** on a content-hash mismatch. So reading the file
 * costs nothing in correctness and buys a fully static page: no per-request database read, no
 * `connection()`, no `<Suspense>`, and no 404 on a checkout where the seed has not run.
 *
 * **This must stay build-time, and that is a deployment constraint rather than a preference.**
 * `next.config.ts` sets `output: "standalone"`, so the runtime image carries only the modules the
 * build traced — `docs/legal/**` is **not** in it. Reading these files per request would work in
 * development and 500 in production. Nothing here touches a dynamic API, so Next prerenders the
 * route and the text is baked into the output.
 *
 * **`react-markdown` with `remark-gfm`, and no `rehype-raw`.** The _política_ contains tables, and a
 * legal document is the one text where a renderer silently dropping a construct is unacceptable.
 * Without `rehype-raw` no embedded HTML is rendered at all, which keeps the page safe by default.
 * Measured: `react-markdown`, `remark` and `micromark` appear only in `.next/server` — zero bytes in
 * any client chunk, because nothing in this subtree is a Client Component.
 */
export function LegalDocument({ slug }: { slug: string }) {
  const document = authoredDocument(slug);
  if (!document) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-[46rem] py-10 md:py-16">
          {/* The version and its effective date, stated before the text. A person citing this
              document — or disputing it — needs to be able to name which one they read, and ADR-0007
              makes the version the thing a `consents` row points at. */}
          <p className="text-muted-foreground border-border mb-8 border-b pb-4 text-sm">
            Versión <strong className="font-semibold">{document.version}</strong> · vigente desde el{" "}
            <time dateTime={document.effectiveFrom}>
              {formatDate(new Date(document.effectiveFrom))}
            </time>
          </p>

          <article>
            <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
              {document.body}
            </Markdown>
          </article>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * The version **in force now**, chosen from the authored files.
 *
 * Selected on `effectiveFrom` rather than by taking the last file in the directory: a version is
 * authored and seeded *before* it takes effect — ADR-0007 requires the art. 5 notification to
 * precede that instant — so the newest file is routinely not the one in force. Publishing it early
 * would show a document nobody had been given yet.
 *
 * **The clock is `BUILD_TIME`, sampled once at module scope, and it has to be.** With
 * `cacheComponents` on, a `new Date()` *inside render* is an unstable value and Next fails the build
 * over it — correctly, since a prerendered page cannot hold a value that changes between renders.
 * Module scope is evaluated once, when the route is prerendered, which is exactly the instant this
 * page is deciding for.
 *
 * The limitation that follows is real and worth stating rather than hiding: a version whose effective
 * date falls between two deploys goes live on the **next deploy**, not on its date. That is
 * acceptable here because a version ships *in* a deploy — the file does not exist before it — so the
 * two events are the same event in practice. It is also why the *evidence* path does not work this
 * way: `currentDisclosure` in `@repo/consent` reads `document_versions` with a real request-time
 * `now`, because which Disclosure a consent points at may not drift by a deploy.
 */
const BUILD_TIME = new Date();

function authoredDocument(slug: string) {
  return readAuthoredDocuments(legalDirectory())
    .filter((document) => document.slug === slug && new Date(document.effectiveFrom) <= BUILD_TIME)
    .sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
    .at(-1);
}

/**
 * `docs/legal` lives at the workspace root, above `apps/web`. Found by walking up to the marker
 * rather than by counting `..` segments, because the number of segments differs between `next dev`
 * and the build's working directory.
 */
function legalDirectory(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return resolve(dir, "docs/legal");
    const parent = dirname(dir);
    if (parent === dir) throw new Error("no pnpm-workspace.yaml above the build's cwd");
    dir = parent;
  }
}

/**
 * A document's effective date, as a person in Pereira reads it: `es-CO`, `America/Bogota`.
 *
 * A date and not a datetime — day, month and year, no clock — because what a reader needs to cite
 * is which version was in force, not the minute it became so.
 *
 * The timezone is named rather than left to the runtime. A Fly machine runs in UTC, so
 * `2026-08-19T00:00:00Z` formatted without it is right by luck and would silently become
 * "18 de agosto" for any document whose effective instant is not midnight UTC.
 */
function formatDate(at: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(at);
}

/**
 * Tailwind v4 has no `@tailwindcss/typography` here, and adding a plugin to style one page would be
 * the larger change. Mapping the handful of elements these documents actually use is smaller, and it
 * keeps the styling in the same token vocabulary as everything else.
 */
const COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-heading mt-10 mb-4 text-3xl font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-heading mt-10 mb-3 text-xl font-semibold tracking-tight">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-heading mt-6 mb-2 text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-4 text-[0.9375rem] leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-4 list-disc space-y-1.5 pl-6 text-[0.9375rem] leading-relaxed">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-4 list-decimal space-y-1.5 pl-6 text-[0.9375rem] leading-relaxed">
      {children}
    </ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary underline underline-offset-4">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-border text-muted-foreground my-5 border-l-2 py-1 pl-4">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-10" />,
  // **The table scrolls inside its own box.** The retention schedule is wide and the reader is on a
  // 390px phone; without this the page body scrolls sideways and every other line goes with it.
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-border bg-muted border px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-border border px-3 py-2 align-top">{children}</td>
  ),
};
