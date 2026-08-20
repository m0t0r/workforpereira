import type { Db, Tx } from "@repo/db";
import { denominations, denominationSkills, skillGroups, skills } from "@repo/db/schema";
import { and, asc, eq } from "drizzle-orm";

import { typeaheadQueries, type TypeaheadRow } from "./queries";
import {
  denominationSlug,
  divipolaCode,
  skillGroupSlug,
  skillSlug,
  type DenominationSlug,
  type DivipolaCode,
  type SkillGroupSlug,
  type SkillSlug,
} from "./slugs";
import { toSearchText } from "./text";

/** One row of the picker's result list (ADR-0023: Skills and Denominations, one box, one list). */
export type CatalogMatch =
  | { kind: "skill"; slug: SkillSlug; name: string }
  | {
      kind: "denomination";
      slug: DenominationSlug;
      name: string;
      /** _"Mesero · añade 6 habilidades"_. Retired Skills are not counted. */
      skillCount: number;
    };

/** One row of the location box. Not part of the skill picker — a different question, a different list. */
export interface MunicipalityMatch {
  divipolaCode: DivipolaCode;
  name: string;
  departmentCode: string;
  departmentName: string;
}

export interface SkillView {
  slug: SkillSlug;
  name: string;
}

/** The browse path (ADR-0023: secondary, never the opening move). */
export interface SkillGroupView {
  slug: SkillGroupSlug;
  name: string;
  skills: SkillView[];
}

/**
 * How many rows a typeahead returns. Ten is a phone screen; the ceiling is here so a caller cannot
 * turn the picker into an export of the vocabulary.
 */
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

/** Rank first, similarity second, name last — the order the queries already sorted each list by. */
function byRelevance(left: TypeaheadRow, right: TypeaheadRow): number {
  if (left.rank !== right.rank) return left.rank - right.rank;
  if (left.score !== right.score) return right.score - left.score;
  return left.name.localeCompare(right.name, "es");
}

/**
 * The picker's one search box: Skills and Denominations in the same result list (ADR-0023).
 *
 * Two queries rather than a `UNION`, merged here. Each list is ranked by the same three-step rule,
 * so merging is a sort over columns Postgres already computed — and keeping them apart is what lets
 * the Denomination carry its skill count without a join every Skill row would have paid for.
 *
 * **A Skill Group can never appear here.** It is browsing scaffolding, not a term (ADR-0012), and
 * the return type has no branch for one.
 */
export async function searchCatalog(
  db: Db | Tx,
  term: string,
  options: { limit?: number } = {},
): Promise<CatalogMatch[]> {
  const normalised = toSearchText(term);
  if (normalised === "") return [];

  const limit = boundedLimit(options.limit);
  const queries = typeaheadQueries(term, limit);

  const skillRows = await db.execute<TypeaheadRow>(queries.skills);
  const denominationRows = await db.execute<TypeaheadRow>(queries.denominations);

  return [...skillRows.rows, ...denominationRows.rows]
    .sort(byRelevance)
    .slice(0, limit)
    .map((row) =>
      row.kind === "denomination"
        ? {
            kind: "denomination" as const,
            slug: denominationSlug(row.slug),
            name: row.name,
            skillCount: row.skill_count,
          }
        : { kind: "skill" as const, slug: skillSlug(row.slug), name: row.name },
    );
}

/**
 * The location box, over the seeded municipalities.
 *
 * Three of them at launch (ADR-0012 as amended by issue #74), and this function does not know that:
 * it reads whatever is seeded, which is why widening the market is rows rather than code.
 */
export async function searchMunicipalities(
  db: Db | Tx,
  term: string,
  options: { limit?: number } = {},
): Promise<MunicipalityMatch[]> {
  const normalised = toSearchText(term);
  if (normalised === "") return [];

  const limit = boundedLimit(options.limit);
  const result = await db.execute<TypeaheadRow>(typeaheadQueries(term, limit).municipalities);

  return result.rows.map((row) => ({
    divipolaCode: divipolaCode(row.slug),
    name: row.name,
    departmentCode: row.department_code,
    departmentName: row.department_name,
  }));
}

/**
 * Every Group with the Skills filed under it, in browse order — the secondary path ADR-0023 keeps.
 *
 * Retired Skills are absent: they leave the picker but not history (ADR-0012). A Group with nothing
 * left in it still appears, because an empty heading is a fact about the vocabulary worth seeing.
 */
export async function listSkillGroups(db: Db | Tx): Promise<SkillGroupView[]> {
  const rows = await db
    .select({
      groupSlug: skillGroups.slug,
      groupName: skillGroups.name,
      skillSlug: skills.slug,
      skillName: skills.name,
      isRetired: skills.isRetired,
    })
    .from(skillGroups)
    .leftJoin(skills, eq(skills.skillGroupId, skillGroups.id))
    .orderBy(asc(skillGroups.position), asc(skillGroups.slug), asc(skills.name));

  const groups = new Map<string, SkillGroupView>();
  for (const row of rows) {
    let group = groups.get(row.groupSlug);
    if (!group) {
      group = { slug: skillGroupSlug(row.groupSlug), name: row.groupName, skills: [] };
      groups.set(row.groupSlug, group);
    }
    // `leftJoin` gives a group with no Skills one row of nulls, and a retired Skill is filed under
    // its Group in the database and absent from the picker.
    if (row.skillSlug !== null && row.skillName !== null && row.isRetired === false) {
      group.skills.push({ slug: skillSlug(row.skillSlug), name: row.skillName });
    }
  }
  return [...groups.values()];
}

/**
 * The Skills a Denomination implies, in the order the picker offers them for pruning (ADR-0023).
 *
 * Retired Skills are absent for the same reason they are absent from the Group listing: choosing
 * `mesero` must never add a term that has left the vocabulary.
 */
export async function skillsForDenomination(
  db: Db | Tx,
  slug: DenominationSlug,
): Promise<SkillView[]> {
  const rows = await db
    .select({ slug: skills.slug, name: skills.name })
    .from(denominations)
    .innerJoin(denominationSkills, eq(denominationSkills.denominationId, denominations.id))
    .innerJoin(skills, eq(skills.id, denominationSkills.skillId))
    // An unknown slug is an empty list rather than a throw: the picker asks this question about
    // whatever the person chose, and a term that has just been retired is a normal race, not a bug.
    .where(and(eq(denominations.slug, slug), eq(skills.isRetired, false)))
    .orderBy(asc(skills.name));

  return rows.map((row) => ({ slug: skillSlug(row.slug), name: row.name }));
}
