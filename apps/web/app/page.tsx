import { Suspense } from "react";

import { Hero } from "./_landing/hero";
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
 * rather than a caching one: under `cacheComponents` this is where Next stops prerendering once the
 * Wall reads a database, so the shell keeps painting immediately while the strip streams. Splitting
 * the Wall onto its own URL later starts from here.
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
        <Hero />
        <MechanismBand />
        {/* A sized fallback, not `null`. Once the Wall reads a database this becomes a streamed
            hole, and an empty fallback would paint the footer directly under the mechanism band and
            then shove it down by the height of two card grids — a large layout shift on the one
            page the edge work exists to make fast. The height is the two headed sections at their
            smallest, which is the single-column case. */}
        <Suspense fallback={<div className="min-h-[48rem]" />}>
          <WallStrip />
        </Suspense>
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
