import { Suspense } from "react";

import { HowItWorks } from "./_landing/how-it-works";
import { MechanismBand } from "./_landing/mechanism-band";
import { SiteFooter } from "./_landing/site-footer";
import { SiteHeader } from "./_landing/site-header";
import { WALL_IS_FICTIONAL } from "./_landing/wall";
import { WallFixtureNotice } from "./_landing/wall-fixture-notice";
import { WallStrip } from "./_landing/wall-strip";

/**
 * The landing page.
 *
 * **There is no hero, and its absence is the design.** A hero has to be addressed to somebody, and
 * `PRODUCT.md`'s fourth principle is two readers of equal weight with neither the guest of the
 * other — so a centred headline either picks one of them or says something so general it says
 * nothing. `WallStrip` puts the two questions side by side at the same size instead, with real
 * answers already under each, and the reader recognises which column is theirs before they have
 * read a sentence. The only thing above them is `MechanismBand`, which is three facts and asks
 * nothing of anybody.
 *
 * **The `<Suspense>` boundary is a render boundary, and it is not ADR-0032's edge cache split.**
 * That distinction is the whole of this comment, because the earlier version of it got it wrong and
 * the mistake is the dangerous direction.
 *
 * Cloudflare caches whole responses keyed by URL. `/` is one URL, so the shell and the Wall strip
 * arrive in one streamed response and can only ever be **one** edge cache entry — the boundary
 * below does not divide them at the edge and cannot. **Two edge cache units require two URLs**: the
 * Wall would have to be fetched separately, from its own route, before ADR-0032's long shell TTL
 * means anything.
 *
 * So the concrete hazard, named here because a comment claiming a split is what would cause it:
 * **do not put a Cloudflare Cache Rule on `/`.** It would edge-cache the Wall along with the shell,
 * which is precisely the window in which a Paused, Suspended or Blocked Person stays on the front
 * page — with no purge to cut it short, which is the thing ADR-0032 exists to prevent.
 *
 * There is a second reason the shell gets nothing today: `cacheComponents` is on, so the moment
 * `readWall` reads a database Next marks `/` partially dynamic and sends `Cache-Control: private,
 * no-cache, no-store` for the whole response. The shell does not keep a long TTL by sitting outside
 * a boundary.
 *
 * **What the boundary is actually worth** is still worth having, and it is a rendering property
 * rather than a caching one: the header, the mechanism band and everything below the Walls paint
 * without waiting on whatever query eventually feeds them.
 *
 * Today the whole route prerenders regardless — `readWall` is constant in production and fixtures
 * outside it — and there is no Cloudflare zone at all, since ADR-0032 is production-only and
 * unprovisioned.
 */
export default function Home() {
  return (
    <>
      {WALL_IS_FICTIONAL ? <WallFixtureNotice /> : null}
      <SiteHeader />
      <main>
        {/* Visually hidden, and the reason is the same one that removed the hero. A page needs one
            `<h1>` — it is what a screen reader reads to answer *where am I*, and skipping straight
            to two `<h2>`s leaves that question unanswered — but the two visible headings are the
            two Walls, at the same size, and promoting either of them to `<h1>` would make one
            reader the subject and the other the audience in the document outline. So the page's own
            title is stated where it costs the layout nothing and the outline gets it back. */}
        <h1 className="sr-only">
          Encuentra: trabajo entre personas, en Pereira y los demás municipios de Risaralda.
        </h1>
        <MechanismBand />
        {/* A sized fallback, not `null`. Once the Wall reads a database this becomes a streamed
            hole, and an empty fallback would paint the footer directly under the mechanism band and
            then shove it down by the height of two full Walls — a large layout shift on the one
            page the edge work exists to make fast.

            **One screenful, and deliberately not an exact figure.** The rendered strip measures
            roughly 198rem at 390, 159rem at 768, 101rem at 1024 and 94rem at 1440 — the *stacked*
            phone case is the tallest, not the shortest, because one column of twelve rows is longer
            than two columns of six. But those numbers come from six fixture rows each, and
            reserving them exactly would be false precision: a real Wall that renders shorter jumps
            the footer *up*, which is the same shift measured the other way. `min-h-svh` reserves a
            screen — enough that the footer is never painted into the hole — and the honest
            reservation lands with `@repo/matching`, when the row count and the Wall's bound are
            known. Nothing renders it today: `readWall` returns a constant, so the route prerenders
            whole. */}
        <Suspense fallback={<div className="min-h-svh" />}>
          <WallStrip />
        </Suspense>
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
