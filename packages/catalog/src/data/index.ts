import type { CatalogSeed } from "../seed";
import { MUNICIPALITIES } from "./municipalities";
import { DENOMINATIONS, SKILL_GROUPS, SKILLS } from "./vocabulary";

/**
 * Everything `pnpm db:seed` loads, in one value: the authored vocabulary (issue #75) and the launch
 * geography (this one).
 *
 * It is data rather than a query, so it is the same in a script, in a test that wants the real thing
 * and in a future admin surface that wants to show what shipped.
 */
export const CATALOG_SEED: CatalogSeed = {
  skillGroups: SKILL_GROUPS,
  skills: SKILLS,
  denominations: DENOMINATIONS,
  municipalities: MUNICIPALITIES,
};
