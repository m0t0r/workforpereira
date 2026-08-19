import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@repo/design-system/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/empty";
import { cn } from "@repo/design-system/lib/utils";

import { Container } from "./container";
import { NeedCard } from "./need-card";
import { ProfileCard } from "./profile-card";
import { readWall } from "./wall";

/**
 * The two Walls, side by side — the only part of this page that holds real people, and the part
 * that replaces a hero.
 *
 * **The two questions _are_ the proposition, so nothing is asked above them.** `PRODUCT.md`'s
 * fourth principle is two readers of equal weight, neither the guest of the other, and a single
 * centred hero has to pick one of them to address. Two columns asking _¿Qué sabes hacer?_ and _¿Qué
 * necesitas que alguien haga?_ state the same thing structurally, in the reader's own grammar,
 * with the answers already visible underneath. That is also why the second column is not a
 * secondary action: it is the same object at the same size.
 *
 * ## The alignment, which is a decision rather than a detail
 *
 * The right question wraps to two lines and the left one does not, so with two independent columns
 * every row below drifts: two headings of different heights, two rules at different heights, two
 * lists starting at different heights. The fix is **`grid-template-rows: subgrid`** — the container
 * owns four rows (question, blurb, action, sample) and each Wall opts into them with
 * `lg:row-span-4 lg:grid-rows-subgrid`, so the four bands are shared and each pair of cells is
 * sized by the taller of the two. The heavy rule sits at the **top of the fourth row**, which is
 * what makes it a single line straight across both columns instead of two lines that nearly agree.
 *
 * Nothing here uses a fixed height, a `min-h-*`, or a matched `line-clamp` on the headings to fake
 * it. Those all break the moment a translation, a longer question or a larger user font size
 * arrives, and they break silently.
 *
 * Below `lg` the Walls stack and there is nothing to align, so the subgrid is not applied at all —
 * the rows become a plain column and the vertical divider becomes a horizontal one.
 *
 * ## What the copy may and may not offer
 *
 * **A Wall is a sample and answers no query** (ADR-0011): bounded, rotating, no public search, no
 * public filter, no pagination, **no "see all"** and no guessable URL. Enumerability rather than
 * visibility is the harm, so the control that must never appear here is the one that turns a
 * handful of people into all of them. That is why the left Wall's foot is a route to an **account**
 * and not a route to more people, and why the right Wall's is `/search/work` — searching **Needs**
 * without an account is a separate public surface ADR-0014 opened deliberately, and linking to it
 * is not a way to enumerate the left Wall.
 *
 * ## Caching
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
 * any row.
 */
export async function WallStrip() {
  const { profiles, needs } = await readWall();

  return (
    <Container className="grid py-12 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-0 lg:gap-y-2 lg:py-16">
      <Wall
        headingId="wall-capabilities"
        question="¿Qué sabes hacer?"
        blurb="Una muestra de lo que contestó gente de Pereira y de los demás municipios de Risaralda. No están todos."
        action={{ href: "/signup", label: "Cuenta lo que sabes hacer" }}
        foot={{ href: "/signup", label: "Con una cuenta puedes buscar por habilidad" }}
        empty={{
          title: "Todavía no hay nadie aquí.",
          description: "Cuando alguien cuente lo que sabe hacer, aparece en esta muestra.",
        }}
        rows={profiles.map((profile) => (
          <ProfileCard key={profile.publicId} profile={profile} />
        ))}
      />

      <Wall
        divided
        headingId="wall-needs"
        question="¿Qué necesitas que alguien haga?"
        blurb="Una muestra de lo que escribió gente que quiere pagarle a alguien por hacerlo. Puede estar aquí al lado o en otro país."
        action={{ href: "/signup", label: "Cuenta lo que necesitas" }}
        foot={{ href: "/search/work", label: "Buscar trabajo sin cuenta" }}
        empty={{
          title: "Todavía no hay nada aquí.",
          description: "Cuando alguien cuente qué necesita, aparece en esta muestra.",
        }}
        rows={needs.map((need) => (
          <NeedCard key={need.publicId} need={need} />
        ))}
      />
    </Container>
  );
}

type WallLink = { href: string; label: string };

/**
 * One Wall: four rows, in the order somebody actually reads them — the question, who answered it,
 * the way in, and the answers.
 *
 * The `divided` flag carries only the divider — it is named for what it draws rather than for
 * which column it is on, because position is not a reason for a component to behave differently
 * and a `second` prop invites one. Everything else is identical between the two columns
 * by construction, which is both the alignment guarantee and `PRODUCT.md`'s equal-weight principle
 * expressed as code rather than as a comment: there is no prop that could make one column louder
 * than the other.
 */
function Wall({
  divided = false,
  headingId,
  question,
  blurb,
  action,
  foot,
  empty,
  rows,
}: {
  divided?: boolean;
  headingId: string;
  question: string;
  blurb: string;
  action: WallLink;
  foot: WallLink;
  empty: { title: string; description: string };
  /** One element per row. A named array rather than `children`, because the emptiness of a Wall
   * decides which of two things it renders, and `children.length` is not a contract React makes. */
  rows: React.ReactNode[];
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-2",
        "lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-y-2",
        divided
          ? "border-border mt-10 border-t pt-10 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:pl-12"
          : "lg:pr-8 xl:pr-12",
      )}
    >
      {/* The second size is what keeps both questions on one line from `lg` up, and it is measured
          rather than chosen. The longer question needs **528px** to set on one line at 36px, and the
          `<h2>`'s own available width — the column minus its padding, not the column — is **455px at
          1024** and **517px from about 1180 up**. So the design's 2.25rem max misses a single line
          by well under a pixel at wide widths, which is why the wrap looks like a bug rather than a
          size problem, and misses it by 70px at 1024.
          `clamp(1.875rem, 2.6vw, 2.125rem)` clears it across that whole band: 30px at 1024 against
          455px available, 33px at 1280, capped at 34px against 517px.
          Below `lg` the Walls stack, a wrapped question has no empty column beside it, and the
          original clamp is untouched. */}
      <h2
        id={headingId}
        className="font-heading text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.12] font-bold tracking-tight text-balance lg:text-[clamp(1.875rem,2.6vw,2.125rem)]"
      >
        {question}
      </h2>

      <p className="text-muted-foreground max-w-[46ch] text-pretty">{blurb}</p>

      {/* Full width at 390 because the row has nothing to share it with and a 40px control floating
          in a 342px content box reads as an afterthought; auto from `sm` up, where it sits under a
          heading it is clearly the answer to. */}
      <div className="mt-3">
        <Button
          render={<Link href={action.href} />}
          nativeButton={false}
          size="lg"
          className="w-full sm:w-auto"
        >
          {action.label}
        </Button>
      </div>

      {/* `lg:h-full lg:justify-between` is the bottom half of the same alignment argument as the
          subgrid above. The two samples are different heights — six Needs carry an author line and
          six Profiles do not — and the fourth row is `1fr`, so the shorter column's cell stretches
          and its foot link would otherwise stop wherever its last row happened to end, leaving a
          void under it and two links at two heights. Pinned to the bottom, the block closes on one
          line across both columns the same way it opens on one. */}
      <div className="border-foreground mt-4 flex flex-col gap-6 border-t-2 pt-6 lg:h-full lg:justify-between">
        {rows.length === 0 ? (
          // States the fact and stops. It does not count what is missing and it does not tell
          // anyone to complete anything — ADR-0023 refuses to score completeness and ADR-0016
          // refuses to pad an empty surface.
          <Empty className="border-border rounded-lg border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{empty.title}</EmptyTitle>
              <EmptyDescription>{empty.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // A real `<ul>` rather than `ItemGroup`, whose `role="list"` needs a matching
          // `role="listitem"` on every child — and on the left Wall the child is an anchor, where an
          // explicit role replaces the implicit link role rather than adding to it. Native list
          // semantics need no roles at all and cannot be got wrong that way.
          //
          // **A grid with equal row tracks, not a flex column.** `auto-rows-fr` makes every card in
          // a Wall the height of the tallest, so a Person who wrote two lines and a Person who wrote
          // four get the same box — which is the whole of "consistent height", and it costs nothing
          // but white space inside the shorter ones. Content stays top-aligned; only the box grows.
          //
          // **`flex-1` is what carries the alignment across to the other Wall.** The sample block is
          // `h-full` inside row 4 of the page's subgrid, so both Walls' blocks are already exactly
          // as tall as each other; giving the list the remaining space makes both lists exactly as
          // tall as each other too. With the same number of cards on each side, card N on the left
          // then lines up with card N on the right — for the same reason, and by the same mechanism,
          // as the four bands above.
          //
          // If the two Walls ever carry different counts the rows stop pairing off, and each column
          // stays internally even. That degrades quietly, which is the right failure.
          <ul className="grid flex-1 auto-rows-fr gap-3">{rows}</ul>
        )}

        <Button
          render={<Link href={foot.href} />}
          nativeButton={false}
          variant="link"
          className="h-auto w-fit px-0"
        >
          {foot.label}
          {/* Drawn, from the project's icon library. A `→` character is a glyph standing in for an
              icon: it inherits the body face's arrow, which is not the same weight as anything else
              on the page, and screen readers read it aloud. */}
          <ArrowRightIcon data-icon="inline-end" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
