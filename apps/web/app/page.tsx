import { Suspense } from "react";

import { Hero } from "./_landing/hero";
import { MechanismBand } from "./_landing/mechanism-band";
import { SiteFooter } from "./_landing/site-footer";
import { SiteHeader } from "./_landing/site-header";
import { WallStrip } from "./_landing/wall-strip";

/**
 * The landing page.
 *
 * **It is two cache units, not one** (ADR-0032). Everything outside the `<Suspense>` boundary is the
 * shell — header, hero, ADR-0026's three mechanism facts, footer — which holds no personal data,
 * changes only on deploy, and is what a long edge TTL is allowed to hold. Inside it is the Wall
 * strip, which holds real people and is never cached anywhere the application cannot invalidate.
 * Keeping the boundary here is what lets the two be treated differently later without restructuring
 * the page.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <MechanismBand />
        <Suspense fallback={null}>
          <WallStrip />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
