import Image from "next/image";
import Link from "next/link";

import { Item, ItemContent, ItemDescription } from "@repo/design-system/components/item";
import { cn } from "@repo/design-system/lib/utils";

import { FOCUS_RING } from "./focus-ring";
import { SkillList } from "./skill-list";
import type { WallProfile } from "./wall";

/**
 * A Capability Profile on the public tier, as one row of the left Wall.
 *
 * **It leads with the Person's own sentence, not with their name.** That ordering is the argument
 * of the whole surface: `PRODUCT.md`'s fifth principle says dignity is structural rather than
 * rhetorical — _"a surface where their capability is the content and the ask belongs to somebody
 * else"_ — and a row opening on _"Cuido niños. Llevo diez años en eso"_ makes the capability the
 * content. A row opening on a name and a face makes the **person** the content, which is the shape
 * of a directory of people pre-selected for economic vulnerability, and it is what ADR-0011 spends
 * its length refusing.
 *
 * **One byline, in one place, whatever the row contains.** This used to branch: a Profile with a
 * Self-description carried the name in a muted line under the prose, and a Profile without one
 * promoted the name to a title at the top, a size larger, with the place on a second line below
 * it. So the name's position, size and colour all changed according to whether somebody happened to
 * write a sentence — which is what the eye catches scanning six rows, and it is why there is now no
 * `ItemTitle` here at all. The prose is optional; the byline is not, and it never moves.
 *
 * **`NeedCard` shares that grammar deliberately**: prose, then who, then the facts, then the
 * skills. The one difference is principled rather than accidental — a Person's place is a property
 * of the person, so it rides in the byline here; a Need's place is a property of the *work*, so it
 * rides with that card's facts instead.
 *
 * **A Person with no Photo gets no placeholder at all** — no silhouette, no grey disc, no initials,
 * no empty ring, and in particular **no `Avatar`**, whose shadcn contract requires an
 * `AvatarFallback` and would reintroduce the hole by the front door. A placeholder is a hole where
 * a face should be, and a hole is a penalty rendered in CSS against a Person for exercising a
 * consent the law requires be free.
 *
 * **The Photo sits on the byline, beside the name.** A face and a name are one piece of
 * information, and both of the obvious alternatives break that: a leading media column puts them
 * together but indents the prose and the skills of every row that has a Photo — four different left
 * edges down one column, with absence made structural — and a trailing one keeps the left edge
 * clean but parks the face at the opposite side of the card from the name it belongs to. On the
 * byline the text column has one left edge for every row, and absence shortens a single line.
 *
 * **Full name and department, never the exact Municipality** — ADR-0011's public tier, where _"face
 * + full name + precise municipality"_ is the combination that turns a card into an address. The
 * full name stays because a Profile is meant to be **shared**, and _"María C."_ undercuts the one
 * act this design most wants to enable.
 *
 * No trust text of any kind and nothing attached to the Person: no badge, no ledger, no line of
 * text. Nothing is verified about anybody, so on a surface where somebody is being judged there is
 * nothing true to say about them.
 */
export function ProfileCard({ profile }: { profile: WallProfile }) {
  return (
    // A real `<li>` rather than `ItemGroup`'s `role="list"` plus `role="listitem"` on each row.
    // That pairing looks equivalent and is not: an explicit `role` **replaces** an element's
    // implicit one, so `role="listitem"` on the anchor below would delete its link role — the row
    // would stop being announced as a link and would disappear from a screen reader's list of
    // links, on the one control that opens a Person's page.
    //
    // `h-full` on both the item and the `<li>`: the list is a grid with equal row tracks, so the
    // card has to fill the track it was given or the border stops short of the next one.
    <li className="h-full">
      <Item
        render={<Link href={`/people/${profile.publicId}`} />}
        variant="outline"
        className={cn(
          // Content stays at the top of a stretched card; only the box grows.
          "h-full items-start",
          // Two of `Item`'s own interaction defaults are overridden rather than inherited, and
          // neither is a preference:
          //
          // - **The focus ring.** `Item` ships shadcn's `ring-[3px] ring-ring/50`. The
          //   accessibility bar asks for a 2px ring at full `--ring`, which is the value the
          //   contrast gate proves clears 3:1 — at half opacity it is not the audited colour.
          //   `focus-ring.ts` is the single definition of that rule precisely because it is the one
          //   least worth having drift between surfaces. `Button` is the documented exemption;
          //   `Item` is not.
          `${FOCUS_RING} focus-visible:ring-0`,
          // - **The hover.** `Item` ships `[a]:hover:bg-muted`, an ungated background change that on
          //   a touch device sticks after the tap. The design system allows an interactive card
          //   transform and shadow only, under a real pointer, inside 180ms — gated behind
          //   `motion-safe` rather than undone by a `motion-reduce` override afterwards, because a
          //   later override of equal specificity wins only by variant sort order and honouring
          //   `prefers-reduced-motion` should not depend on that.
          "[a]:hover:bg-card",
          "motion-safe:transition-[transform,box-shadow] motion-safe:duration-150",
          "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
          "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
        )}
      >
        <ItemContent className="gap-2.5">
          {profile.selfDescription === null ? null : (
            // Clamped at three lines so one long Self-description cannot push the rest of the
            // sample below the fold — the full text is on the Person's own page, one tap away, and
            // the row links straight to it. `max-w-prose` binds the measure at the widths where the
            // two Walls are stacked rather than side by side: a row is full-bleed at 768, and a
            // 90-character line is measurably harder to read than a 65-character one.
            <p className="line-clamp-3 max-w-prose text-base leading-snug text-pretty">
              {profile.selfDescription}
            </p>
          )}

          {/* The face sits **on the byline, beside the name**, because a face and a name are one
              piece of information and a layout that puts them at opposite edges of the card asks
              the reader to join them back up. It is not `ItemMedia`: that slot is a sibling of
              `ItemContent` and lives outside the text column by construction, which is exactly the
              separation being undone here.

              This also costs the least when there is no Photo. A leading media column indents the
              prose and the skills of every row that has one, so absence shows up as a different
              left edge for the whole card; on the byline, absence shortens one line and nothing
              else moves. No placeholder, no reserved gap — the name simply starts where the prose
              starts. */}
          <div className="flex items-center gap-2.5">
            {profile.photoUrl === null ? null : (
              <Image
                // Empty alt on purpose: the name sits beside it, and "Foto de María" read out
                // before "María" is noise. The Photo is never described, classified or processed —
                // under Colombian law a face is sensitive data (ADR-0010).
                alt=""
                src={profile.photoUrl}
                width={80}
                height={80}
                // Photos are served from R2 behind a presigned URL (ADR-0010). `next/image`
                // optimisation and its `remotePatterns` land with that pipeline, not here.
                unoptimized
                // A rounded square, never a circle: a circular crop reads as an avatar, and an
                // avatar implies an account rather than a person.
                className="size-10 shrink-0 rounded-md object-cover"
              />
            )}
            <ItemDescription>
              <span className="text-foreground font-medium">{profile.fullName}</span> ·{" "}
              {placeLine(profile)}
            </ItemDescription>
          </div>

          <SkillList skills={profile.skills} />
        </ItemContent>
      </Item>
    </li>
  );
}

/**
 * The department, and whether they also work at a distance. **Never the Municipality**, and never a
 * count of anything.
 */
function placeLine(profile: WallProfile): string {
  return profile.remote ? `${profile.department} · también a distancia` : profile.department;
}
