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
 * It mirrors `ProfileCard` deliberately — the author's own sentence first, the facts under it — so
 * the two Walls read as two answers to the same question rather than as two different products.
 * `PRODUCT.md`'s fourth principle is that neither reader is the guest of the other, and identical
 * row shapes are how a layout says that without a sentence claiming it.
 *
 * Three things it deliberately is not:
 *
 * - **Not a link to a Need detail page.** Need detail requires a session (ADR-0011's fields table),
 *   so the row is the whole of the public disclosure and the only link on it is the author's. That
 *   is also why it is a plain `Item` and not one rendered as an anchor.
 * - **Never a Photo**, which keeps ADR-0011's photo consent doing one job in one place.
 * - **No trust text**, like every other surface where somebody is being judged.
 *
 * The exact Municipality is public here, unlike a Person's, and it appears **instead of** the
 * department rather than beside it (ADR-0030 amending ADR-0014): for four of the five Work Settings
 * a Need's place is where the work happens and says nothing about where its author lives. For
 * `hirer_home` — the one setting where those collapse into a single value — the **author** gives way
 * instead, and `author` arrives null. **That branch belongs to the projection, not to this
 * component**: a card handed a name renders one, which is what lets the rule carry an Invariant Test.
 */
export function NeedCard({ need }: { need: WallNeed }) {
  return (
    // Rendered as the `<li>` itself. `ItemGroup`'s `role="list"` plus a `role="listitem"` per row
    // would work here — this row is not a link — but the two Walls would then be built from two
    // different list mechanisms, and only one of them survives a refactor. See `ProfileCard` for why
    // the explicit role is wrong there.
    <Item render={<li />} variant="outline" className="items-start">
      <ItemContent className="gap-2">
        {/* Clamped and measure-bound for the same reasons as `ProfileCard`'s: one long
            Self-description may not push the rest of the sample off the screen, and a row is
            full-bleed at the widths where the two Walls stack. */}
        <p className="line-clamp-3 max-w-prose text-base leading-snug text-pretty">
          {need.selfDescription}
        </p>
        <ItemDescription>{metaLine(need)}</ItemDescription>
        <SkillList skills={need.skills} />
        {need.author === null ? (
          // No link, and no explanation of the absence beyond the fact. Saying *why* the name is
          // withheld would describe the author's home to the reader in words instead of in a field.
          <ItemDescription>Con una cuenta ves quién lo publicó.</ItemDescription>
        ) : (
          <Link
            href={`/people/${need.author.publicId}`}
            className={`${FOCUS_RING} w-fit rounded-sm text-sm underline underline-offset-4`}
          >
            {need.author.fullName}
          </Link>
        )}
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
function metaLine(need: WallNeed): string {
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
