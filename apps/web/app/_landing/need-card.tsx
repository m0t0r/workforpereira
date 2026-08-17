import Link from "next/link";

import type { Commitment, WallNeed, WorkSetting } from "./wall";

/** ADR-0033's three values, as UI copy over the English enum (ADR-0001). */
const COMMITMENT_LABEL: Record<Commitment, string> = {
  one_off: "Una vez",
  temporary: "Por un tiempo",
  ongoing: "Sin fecha de fin",
};

/**
 * ADR-0013's five values. The copy names a kind of place and never implies the place was checked —
 * ADR-0013's warning, which ADR-0030 restates as binding on exactly this card.
 */
const WORK_SETTING_LABEL: Record<WorkSetting, string> = {
  hirer_home: "En la casa de quien contrata",
  worker_home: "En la casa de quien haga el trabajo",
  business_premises: "En un negocio o un local",
  public_or_varied: "En la calle o en varios lugares",
  remote: "A distancia",
};

/**
 * A public Need card: **the work, not the author** (ADR-0014).
 *
 * Three things it deliberately is not:
 *
 * - **Not a link to a Need detail page.** Need detail requires a session (ADR-0011's fields table).
 *   The card is the whole of the public disclosure, so the only link on it is the author's.
 * - **Never a Photo**, which keeps ADR-0011's photo consent doing one job in one place.
 * - **No trust text**, like every other surface where somebody is being judged (ADR-0026).
 *
 * The exact Municipality is public here, unlike a Person's (ADR-0030): for four of the five Work
 * Settings a Need's place is where the work happens and says nothing about where its author lives.
 * For `hirer_home` — the one setting where those collapse into a single value — the **author** gives
 * way instead, and `author` arrives null. **That branch belongs to the projection, not to this
 * component**: a card handed a name renders one, which is what lets the rule carry an Invariant Test.
 */
export function NeedCard({ need }: { need: WallNeed }) {
  return (
    <li className="bg-card border-border flex h-full flex-col gap-3 rounded-lg border p-5">
      <p className="font-heading font-semibold tracking-tight">
        {need.municipality}, {need.department}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {need.skills.map((skill) => (
          <li
            key={skill}
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs"
          >
            {skill}
          </li>
        ))}
      </ul>
      <p className="text-sm">{need.selfDescription}</p>
      <dl className="text-muted-foreground mt-auto grid grid-cols-[auto_1fr] gap-x-2 text-sm">
        <dt>Dedicación:</dt>
        <dd>{COMMITMENT_LABEL[need.commitment]}</dd>
        <dt>Lugar:</dt>
        <dd>{WORK_SETTING_LABEL[need.workSetting]}</dd>
      </dl>
      {need.author === null ? (
        <p className="text-muted-foreground text-sm">Con una cuenta ves quién lo publicó.</p>
      ) : (
        <Link
          href={`/people/${need.author.publicId}`}
          className="focus-visible:outline-ring w-fit rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {need.author.fullName}
        </Link>
      )}
    </li>
  );
}
