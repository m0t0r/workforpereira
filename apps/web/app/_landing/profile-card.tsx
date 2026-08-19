import Image from "next/image";
import Link from "next/link";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@repo/design-system/components/item";
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
 * else"_ — and a row opening on _"Cocino para veinte personas y no se me quema nada"_ makes the
 * capability the content. A row opening on a name and a face makes the **person** the content,
 * which is the shape of a directory of people pre-selected for economic vulnerability, and it is
 * what ADR-0011 spends its length refusing.
 *
 * **Two layouts, because `selfDescription` is null more often than not.** ADR-0025 does not ask a
 * worker for one during the first run, so a Profile has none until its author goes back and writes
 * one. There is no filler sentence and no _"Sin descripción"_: when the prose is absent the **name**
 * takes the leading position, at `ItemTitle`'s weight, and the row is simply shorter. Both branches
 * are in the fixtures on purpose — a layout only one of which is ever seen in dev is a layout
 * nobody notices regressing.
 *
 * **A Person with no Photo gets no placeholder at all** — no silhouette, no grey disc, no initials,
 * no empty ring, and in particular **no `Avatar`**, whose shadcn contract requires an
 * `AvatarFallback` and would reintroduce the hole by the front door. A placeholder is a hole where
 * a face should be, and a hole is a penalty rendered in CSS against a Person for exercising a
 * consent the law requires be free. ADR-0026 is under rework and no longer binding on new design
 * work; this rule survives it on `PRODUCT.md`'s own terms, and this comment is the only guard it
 * has.
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
    // Two of `Item`'s own interaction defaults are overridden rather than inherited, and neither is
    // a preference:
    //
    // - **The focus ring.** `Item` ships shadcn's `ring-[3px] ring-ring/50`. The accessibility bar
    //   asks for a **2px ring at full `--ring`**, which is the value the contrast gate proves clears
    //   3:1 — at half opacity it is not the audited colour. `focus-ring.ts` is the single definition
    //   of that rule precisely because it is the one least worth having drift between surfaces, and
    //   `NeedCard`'s author link already uses it. `Button` is the documented exemption; `Item` is
    //   not.
    // - **The hover.** `Item` ships `[a]:hover:bg-muted`, an ungated background change that on a
    //   touch device sticks after the tap. The design system allows an interactive card **transform
    //   and shadow only, under a real pointer, inside 180ms** — gated behind `motion-safe` rather
    //   than undone by a `motion-reduce` override afterwards, because a later override of equal
    //   specificity wins only by variant sort order and honouring `prefers-reduced-motion` should
    //   not depend on that.
    //
    // `items-start` because the media is a 56px square beside three stacked lines and centring it
    // floats the face.
    <li>
      <Item
        render={<Link href={`/people/${profile.publicId}`} />}
        variant="outline"
        className={cn(
          "items-start",
          `${FOCUS_RING} focus-visible:ring-0`,
          "[a]:hover:bg-card",
          "motion-safe:transition-[transform,box-shadow] motion-safe:duration-150",
          "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
          "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
        )}
      >
        {profile.photoUrl === null ? null : (
          <ItemMedia variant="image" className="size-14 rounded-lg sm:size-16">
            <Image
              // Empty alt on purpose: the name sits beside it, and "Foto de María" read out before
              // "María" is noise. The Photo is never described, classified or processed — under
              // Colombian law a face is sensitive data (ADR-0010).
              alt=""
              src={profile.photoUrl}
              width={128}
              height={128}
              // Photos are served from R2 behind a presigned URL (ADR-0010). `next/image`
              // optimisation and its `remotePatterns` land with that pipeline, not here.
              unoptimized
            />
          </ItemMedia>
        )}

        <ItemContent className="gap-2">
          {profile.selfDescription === null ? (
            <>
              <ItemTitle className="text-base">{profile.fullName}</ItemTitle>
              <ItemDescription>{placeLine(profile)}</ItemDescription>
            </>
          ) : (
            <>
              {/* Not `ItemTitle`: that slot is `w-fit`, flex and single-line, which is right for a
                label and wrong for a sentence. Clamped at three lines so one long Self-description
                cannot push the rest of the sample below the fold — the full text is on the Person's
                own page, one tap away, and the row links straight to it. `max-w-prose` binds the
                measure at the widths where the two Walls are stacked rather than side by side: a row
                is full-bleed at 768, and a 90-character line is measurably harder to read than a
                65-character one. */}
              <p className="line-clamp-3 max-w-prose text-base leading-snug text-pretty">
                {profile.selfDescription}
              </p>
              <ItemDescription>
                <span className="text-foreground font-medium">{profile.fullName}</span> ·{" "}
                {placeLine(profile)}
              </ItemDescription>
            </>
          )}
          <SkillList skills={profile.skills} />
        </ItemContent>
      </Item>
    </li>
  );
}

/**
 * The department, and whether they also work at a distance. **Never the Municipality**, and never a
 * count of anything. One function rather than two copies of the field order, because a second copy
 * is a second place for the exact Municipality to creep back in.
 */
function placeLine(profile: WallProfile): string {
  return profile.remote ? `${profile.department} · también a distancia` : profile.department;
}
