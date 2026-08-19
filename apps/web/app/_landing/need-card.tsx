import Link from "next/link";

import { Item, ItemContent, ItemDescription } from "@repo/design-system/components/item";

import { FOCUS_RING } from "./focus-ring";
import { SkillList } from "./skill-list";
import type { Commitment, WallNeed, WorkSetting } from "./wall";

/** ADR-0033's three values, as UI copy over the English enum (ADR-0001). */
const COMMITMENT_LABEL: Record<Commitment, string> = {
  one_off: "Una vez",
  temporary: "Por un tiempo",
  ongoing: "Sin fecha de fin",
};

/**
 * ADR-0013's five values. The copy names a kind of place and never implies the place was checked —
 * ADR-0013's warning, which ADR-0030 restates as binding on exactly this card. The two sides are
 * named with `CONTEXT.md`'s own Spanish, _quien contrata_ and _quien trabaja_, so the card does not
 * invent a second vocabulary for the two roles.
 */
const WORK_SETTING_LABEL: Record<WorkSetting, string> = {
  hirer_home: "En la casa de quien contrata",
  worker_home: "En la casa de quien trabaja",
  business_premises: "En un negocio o un local",
  public_or_varied: "En la calle o en varios lugares",
  remote: "A distancia",
};

/**
 * A public Need row: **the work, not the author** (ADR-0014).
 *
 * **It shares `ProfileCard`'s grammar exactly**: prose, then who, then the facts, then the skills,
 * in that order, at those sizes, with the byline never moving. `PRODUCT.md`'s fourth principle is
 * that neither reader is the guest of the other, and two cards built to one grammar is how a layout
 * says that without a sentence claiming it. The two previously diverged — the author sat at the
 * *bottom* here and second on a Profile — which is what made a column of them look unfinished.
 *
 * **The one difference is principled.** A Person's place is a property of the person, so it rides in
 * their byline; a Need's place is a property of the **work**, so it rides with the facts here. That
 * is also why the facts line leads with the Municipality: for four of ADR-0013's five Work Settings
 * it is where the work happens and says nothing about where its author lives.
 *
 * Three things it deliberately is not:
 *
 * - **Not a link to a Need detail page.** ADR-0011's field table puts *Need detail* in the
 *   requires-a-session column, so this card is the whole of the public disclosure and the only link
 *   on it is the author's. The asymmetry with `ProfileCard` — whose whole row is a link, because a
 *   Person *has* a public page — is real and is kept: under Ley 1581 the Profile is the dangerous
 *   object and gets a shareable URL anyway because sharing is the acquisition mechanism, while under
 *   the SPE regime the **Need** is the dangerous one (Res. 000129 art. 5's _publicación de
 *   vacantes_), which is why ADR-0014 will not even index a results page. A gated `/needs/<id>`
 *   would be compatible with all of that and is simply not built.
 * - **Never a Photo**, which keeps ADR-0011's photo consent doing one job in one place.
 * - **No trust text**, like every other surface where somebody is being judged.
 *
 * For `hirer_home` — the one setting where a Need's Municipality is also its author's home — the
 * **author** gives way instead, and `author` arrives null. **That branch belongs to the projection,
 * not to this component**: a card handed a name renders one, which is what lets the rule carry an
 * Invariant Test.
 */
export function NeedCard({ need }: { need: WallNeed }) {
  return (
    // `h-full` so the card fills the equal-height grid track the list gives it; content stays at the
    // top and only the box grows.
    <Item render={<li />} variant="outline" className="h-full items-start">
      <ItemContent className="gap-2">
        {/* Clamped and measure-bound for the same reasons as `ProfileCard`'s: one long
            Self-description may not push the rest of the sample off the screen, and a row is
            full-bleed at the widths where the two Walls stack. */}
        <p className="line-clamp-3 max-w-prose text-base leading-snug text-pretty">
          {need.selfDescription}
        </p>

        {/* The byline slot — the same row of the same card, whichever Wall it is on. */}
        {need.author === null ? (
          // No name, and no explanation of the absence beyond the fact. Saying *why* it is withheld
          // would describe the author's home to the reader in words instead of in a field.
          <ItemDescription>Con una cuenta ves quién lo publicó.</ItemDescription>
        ) : (
          <Link
            href={`/people/${need.author.publicId}`}
            className={`${FOCUS_RING} text-foreground w-fit rounded-sm text-sm font-medium underline underline-offset-4`}
          >
            {need.author.fullName}
          </Link>
        )}

        <ItemDescription>{factsLine(need)}</ItemDescription>
        <SkillList skills={need.skills} />
      </ItemContent>
    </Item>
  );
}

/**
 * Place, Work Setting and Commitment as one wrapping line — the three facts a worker weighs before
 * reading further, and the three ADR-0030 and ADR-0033 put on the public tier. Nothing about pay and
 * nothing about hours or dates: a Need quoting a schedule is a _vacante_ in everything but name,
 * which is the object the platform's stated exposure turns on.
 *
 * `remote` is appended rather than folded into the Work Setting because ADR-0030 keeps the two
 * apart deliberately — remote work is a property of the Publication, and `remote` is separately one
 * of the five Settings. The guard is only against printing the same fact twice.
 */
function factsLine(need: WallNeed): string {
  const parts = [
    need.municipality,
    WORK_SETTING_LABEL[need.workSetting],
    COMMITMENT_LABEL[need.commitment],
  ];
  if (need.remote && need.workSetting !== "remote") {
    parts.push("también a distancia");
  }
  return parts.join(" · ");
}
