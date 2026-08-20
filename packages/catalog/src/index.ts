/**
 * `@repo/catalog` — the vocabulary the whole product searches on, and the places it runs in.
 *
 * Tier 1 of ADR-0006's DAG: it depends on `@repo/db` and nothing else. **This file is the seam**
 * (ADR-0017) — every function below takes a `Db | Tx` as its first argument or takes no handle at
 * all, and those are the only two kinds of thing a test may reach for.
 *
 * The decisions the shape of this module is made of:
 *
 * - **A Skill is a capability, never an occupation, and the list is flat** (ADR-0012). A Skill Group
 *   is a heading, never a term — `SkillGroupSlug` and `SkillSlug` are different types so that
 *   attaching one to a Publication is a compile error rather than a review comment.
 * - **A Denomination is a way *into* the vocabulary** (ADR-0012, ADR-0023): typing `mesero` returns
 *   it beside the Skills, and choosing it offers the Skills it implies for the person to prune.
 * - **`search_text` is written on write and `unaccent` never runs in a query** (ADR-0014, amended by
 *   ADR-0031), which is why `typeaheadQueries` is exported: it is a pure value the invariant test
 *   renders and asserts on, and the same value the search functions execute.
 * - **A term is retired, never deleted** (ADR-0012).
 * - **The seed is three municipalities** (ADR-0012 as amended by issue #74) and the table is
 *   unbounded. Widening the market is rows in `src/data/`, not a migration.
 */

export { authorDenomination, authorSkill, retireDenomination, retireSkill } from "./authoring";
export type {
  AuthorDenominationInput,
  AuthorSkillInput,
  RetireDenominationOptions,
  RetireOptions,
} from "./authoring";

export { CATALOG_SEED } from "./data/index";
export { MUNICIPALITIES } from "./data/municipalities";
export { DENOMINATIONS, SKILL_GROUPS, SKILLS } from "./data/vocabulary";

export { typeaheadQueries, type TypeaheadQueries, type TypeaheadRow } from "./queries";

export {
  listSkillGroups,
  searchCatalog,
  searchMunicipalities,
  skillsForDenomination,
} from "./search";
export type { CatalogMatch, MunicipalityMatch, SkillGroupView, SkillView } from "./search";

export { seedCatalog } from "./seed";
export type {
  CatalogSeed,
  DenominationSeed,
  MunicipalitySeed,
  SeedCount,
  SeedReport,
  SkillGroupSeed,
  SkillSeed,
} from "./seed";

export { denominationSlug, divipolaCode, skillGroupSlug, skillSlug } from "./slugs";
export type { DenominationSlug, DivipolaCode, SkillGroupSlug, SkillSlug } from "./slugs";

export { toSearchText, toSlug } from "./text";
