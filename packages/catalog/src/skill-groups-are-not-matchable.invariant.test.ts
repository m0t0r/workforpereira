/**
 * **Invariant Test — ADR-0012.**
 *
 * _"A Skill Group exists for browsing only — never stored on a Publication and never matched."_
 *
 * The taxonomy is flat because with two levels _matching must decide which level wins_, and
 * whichever way that resolves, the upper tier reimports the "what were you employed as" framing the
 * product exists to escape. A Group that could be attached to a Publication **is** that upper tier,
 * arriving by accident.
 *
 * The guard has two halves, because the failure has two shapes:
 *
 * - **A Group reaching a Publication**, which is a type error. `SkillGroupSlug` and `SkillSlug` are
 *   both strings at runtime and different types at compile time, so the `@ts-expect-error` lines
 *   below fail `check-types` the moment the brands are collapsed — that is the assertion, and it is
 *   checked by the compiler rather than by Vitest.
 * - **A Group reaching the picker**, which is not a type error but a query. `searchCatalog` searches
 *   Skills and Denominations; the Group's own name may match the term and must not come back.
 *
 * Weakening either half means amending ADR-0012.
 */

import { withRollback } from "@repo/db/testing";

import { givenACatalog } from "./fixtures";
import {
  searchCatalog,
  skillGroupSlug,
  skillSlug,
  type SkillGroupSlug,
  type SkillSlug,
} from "./index";

/**
 * What `@repo/publications` will do with a Skill (ADR-0006, tier 4): a Publication carries Skills,
 * between one and twenty of them (ADR-0012). Standing in for it here so the compile error has
 * somewhere to happen before that package exists.
 */
function attachToPublication(skills: readonly SkillSlug[]): number {
  return skills.length;
}

/** The other direction: the browse path takes a heading, and a term is not one. */
function browseGroup(group: SkillGroupSlug): string {
  return group;
}

describe("a Skill Group", () => {
  it("cannot be attached to a Publication — the type system refuses it", () => {
    const skill = skillSlug("cocina-casera");
    const group = skillGroupSlug("cocina-y-alimentos");

    expect(attachToPublication([skill])).toBe(1);

    // @ts-expect-error ADR-0012: a Skill Group is browsing scaffolding, never a matching key. If
    // this line ever compiles, the flat vocabulary has grown a second level.
    expect(attachToPublication([group])).toBe(1);

    expect(browseGroup(group)).toBe("cocina-y-alimentos");

    // The same refusal in the other direction, so the brands cannot be collapsed one way either.
    // @ts-expect-error ADR-0012: a Skill is a term, not a heading.
    expect(browseGroup(skill)).toBe("cocina-casera");
  });

  it(
    "never appears in the picker, even when its own name is what was typed",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      // "Cocina y alimentos" is a Group and "Cocina casera" is a Skill. Only one of them is a term.
      const matches = await searchCatalog(tx, "cocina");

      expect(matches.map((match) => match.name)).toContain("Cocina casera");
      expect(matches.map((match) => match.name)).not.toContain("Cocina y alimentos");
      // There is deliberately no assertion on `match.kind` here: `CatalogMatch` has no branch for a
      // Group, so the compiler refuses one before a test could observe it — and oxlint's
      // `no-unnecessary-condition` says so out loud if this is written as a runtime check.
    }),
  );
});
