import Link from "next/link";

import { Container } from "./container";
import { FOCUS_RING } from "./focus-ring";
import { NeedCard } from "./need-card";
import { ProfileCard } from "./profile-card";
import { readWall } from "./wall";

/**
 * The two Walls — the only part of this page that holds real people.
 *
 * **A Wall is a sample and answers no query** (ADR-0011): bounded, rotating, no public search, no
 * public filter, no pagination, no "see all" and no guessable URL. Enumerability rather than
 * visibility is the harm, so what must not appear here is a control that turns a handful of people
 * into all of them. Searching **Needs** without an account is a separate public surface ADR-0014
 * opened deliberately, and linking to it is not a way to enumerate this Wall.
 *
 * **Nothing here may ever be edge-cached** (ADR-0032) — which today means `/` may not be, because
 * this strip shares that URL. Cloudflare caches whole responses keyed by URL, so the shell around
 * this component and this component are one edge cache entry however they are rendered; the
 * `<Suspense>` boundary in `page.tsx` is a render boundary and does not divide them. **ADR-0032's
 * long shell TTL therefore waits on this strip moving to its own URL**, and until it does, a Cache
 * Rule on `/` would cache real people at an edge with no purge behind it. `page.tsx` carries the
 * long version of that.
 *
 * `stale-while-revalidate` is refused here specifically: with no purge there is no way to cut a
 * stale copy short, and what it would extend is the window in which a Paused, Suspended or Blocked
 * Person is still on the front page. If this ever needs help it is cached at the **origin**, where
 * the application can invalidate it.
 *
 * **None of that is enforced yet, and today's build does not show it.** ADR-0032 is production-only
 * and unprovisioned — there is no Cloudflare zone — and `readWall` is constant in production, so
 * `next build` still prerenders this strip into the static shell.
 *
 * The copy never calls the people on it verified, checked or trusted, and there is no trust text on
 * any card (ADR-0026).
 */
export async function WallStrip() {
  const { profiles, needs } = await readWall();

  return (
    <Container className="flex flex-col gap-16 py-16">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            Lo que sabe hacer la gente
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Una muestra: no están todos. Para buscar a alguien por habilidad necesitas una cuenta.
          </p>
        </div>
        {profiles.length === 0 ? (
          <EmptyWall>
            Todavía no hay perfiles publicados. Cuando los haya, aquí se ve una muestra.
          </EmptyWall>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.publicId} profile={profile} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            Lo que la gente necesita
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Una muestra: no están todas. Estas sí las puedes{" "}
            <Link
              href="/search/work"
              className={`${FOCUS_RING} rounded-sm underline underline-offset-4`}
            >
              buscar por habilidad sin cuenta
            </Link>
            .
          </p>
        </div>
        {needs.length === 0 ? (
          <EmptyWall>
            Todavía no hay necesidades publicadas. Cuando las haya, aquí se ve una muestra.
          </EmptyWall>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {needs.map((need) => (
              <NeedCard key={need.publicId} need={need} />
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

/**
 * The empty state states the fact and stops. It does not count what is missing, and it does not tell
 * anyone to complete anything — ADR-0023 refuses to score completeness and ADR-0016 refuses to pad
 * an empty surface.
 */
function EmptyWall({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center">
      {children}
    </p>
  );
}
