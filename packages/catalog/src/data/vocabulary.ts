import type { DenominationSeed, SkillGroupSeed, SkillSeed } from "../seed";

/**
 * The authored vocabulary — **empty here, and authored in issue #75**.
 *
 * This ticket builds the shape and the pipeline; the ~300 Skills, the 14 Groups and the Denomination
 * bundles are the next one's whole subject, because ADR-0012 makes every term an art. 5 judgement
 * (_a term names something you do, never something you are_) rather than an import.
 *
 * Empty is deliberate rather than unfinished: `pnpm db:seed` runs today, loads the municipalities,
 * and reports three lists of zero — which is the honest state of the vocabulary and is visible in
 * one line of output rather than in a ticket nobody opens. The fixture vocabulary on
 * `prototype/skill-picker` is **not** the seed (ADR-0023), and neither are this package's test
 * fixtures.
 */

export const SKILL_GROUPS: readonly SkillGroupSeed[] = [];

export const SKILLS: readonly SkillSeed[] = [];

export const DENOMINATIONS: readonly DenominationSeed[] = [];
