import { denominations, denominationSkills, municipalities, skills } from "@repo/db/schema";
import { sql, type SQL } from "drizzle-orm";

import { toSearchText } from "./text";

/**
 * The typeahead, as three values rather than three round trips.
 *
 * They are built here, away from the functions that run them, for one reason: ADR-0014's promise is
 * about the **SQL**, and SQL that can be rendered without a database can be asserted on without one
 * — see `unaccent-never-runs-in-a-query.invariant.test.ts`. `searchCatalog` and
 * `searchMunicipalities` execute exactly these values, so the guard cannot drift from the query.
 *
 * The shape of a match, in order of what a person means by it:
 *
 * 1. the term is how the entry **starts** — `mes` → `Mesero`;
 * 2. the term appears **inside** it — `caja` → `Manejo de caja`;
 * 3. the term is a near miss — `mesreo` → `Mesero`, via `pg_trgm`.
 *
 * All three read the precomputed `search_text` column. `unaccent()` appears in none of them, which
 * is the whole point: it ran once, on write, in application code.
 *
 * **The near-miss branch is `word_similarity`, not `similarity`, and the threshold is 0.4.**
 * `similarity()` compares whole strings, so `mesreo` against `mesero` scores 0.27 — below
 * `pg_trgm`'s own 0.3 default — and `atencion` against `atencion al cliente` scores 0.47 only
 * because the phrase is short. `word_similarity(term, text)` measures the term against the best
 * matching *extent* of the text, which is what a typeahead means: `mesreo` → 0.43, `cosina` against
 * `cocina casera` → 0.43, `pereria` → 0.5. Below 0.4 sits one transposition in a six-letter word, so
 * 0.4 is where a typo stops and a different word starts.
 *
 * The function rather than the `<%` operator, deliberately. The operator reads
 * `pg_trgm.word_similarity_threshold`, whose default of 0.6 rejects every typo above, and setting a
 * GUC would mean a second statement travelling with every query. The cost is that the near-miss
 * branch scans rather than using the GIN index — over three closed lists, the largest of which is
 * CUOC's 14,462 denominations, which is a few milliseconds and is the branch a `LIKE` did not
 * already answer from the index.
 */

/** The columns every result carries, so the three lists can be merged and ranked together. */
export interface TypeaheadRow extends Record<string, unknown> {
  kind: "skill" | "denomination" | "municipality";
  slug: string;
  name: string;
  /** How the term matched: 0 starts-with, 1 contains, 2 similar. Lower sorts first. */
  rank: number;
  /** `pg_trgm` word similarity, the tie-break inside a rank. */
  score: number;
  /** Denominations only — _"Mesero · añade 6 habilidades"_ (ADR-0023). Zero elsewhere. */
  skill_count: number;
  /** Municipalities only. Empty elsewhere. */
  department_code: string;
  department_name: string;
}

/**
 * The three queries, named. A `Record<string, SQL>` would let a fourth searchable table appear
 * without the invariant test noticing; this way adding one is a type error there first.
 */
export interface TypeaheadQueries {
  skills: SQL;
  denominations: SQL;
  municipalities: SQL;
}

/**
 * Every query the package emits over `search_text`, for one term.
 *
 * The term is normalised **here**, once, by the same function that wrote the column — so `%` and
 * `_` cannot reach a `LIKE` pattern and no escaping is needed anywhere.
 */
/** See the file header: one transposition in a six-letter word scores 0.43, and 0.4 admits it. */
const NEAR_MISS = 0.4;

export function typeaheadQueries(term: string, limit: number): TypeaheadQueries {
  const normalised = toSearchText(term);
  const startsWith = `${normalised}%`;
  const contains = `%${normalised}%`;

  return {
    skills: sql`
      select 'skill' as kind,
             ${skills.slug} as slug,
             ${skills.name} as name,
             case
               when ${skills.searchText} like ${startsWith} then 0
               when ${skills.searchText} like ${contains} then 1
               else 2
             end as rank,
             word_similarity(${normalised}, ${skills.searchText}) as score,
             0 as skill_count,
             '' as department_code,
             '' as department_name
        from ${skills}
       where ${skills.isRetired} = false
         and (${skills.searchText} like ${contains}
              or word_similarity(${normalised}, ${skills.searchText}) >= ${NEAR_MISS})
       order by rank, score desc, ${skills.name}
       limit ${limit}
    `,

    denominations: sql`
      select 'denomination' as kind,
             ${denominations.slug} as slug,
             ${denominations.name} as name,
             case
               when ${denominations.searchText} like ${startsWith} then 0
               when ${denominations.searchText} like ${contains} then 1
               else 2
             end as rank,
             word_similarity(${normalised}, ${denominations.searchText}) as score,
             (select count(*)::int
                from ${denominationSkills}
                join ${skills} on ${skills.id} = ${denominationSkills.skillId}
               where ${denominationSkills.denominationId} = ${denominations.id}
                 and ${skills.isRetired} = false) as skill_count,
             '' as department_code,
             '' as department_name
        from ${denominations}
       where ${denominations.isRetired} = false
         and (${denominations.searchText} like ${contains}
              or word_similarity(${normalised}, ${denominations.searchText}) >= ${NEAR_MISS})
       order by rank, score desc, ${denominations.name}
       limit ${limit}
    `,

    municipalities: sql`
      select 'municipality' as kind,
             ${municipalities.divipolaCode} as slug,
             ${municipalities.name} as name,
             case
               when ${municipalities.searchText} like ${startsWith} then 0
               when ${municipalities.searchText} like ${contains} then 1
               else 2
             end as rank,
             word_similarity(${normalised}, ${municipalities.searchText}) as score,
             0 as skill_count,
             ${municipalities.departmentCode} as department_code,
             ${municipalities.departmentName} as department_name
        from ${municipalities}
       where ${municipalities.searchText} like ${contains}
          or word_similarity(${normalised}, ${municipalities.searchText}) >= ${NEAR_MISS}
       order by rank, score desc, ${municipalities.name}
       limit ${limit}
    `,
  };
}
