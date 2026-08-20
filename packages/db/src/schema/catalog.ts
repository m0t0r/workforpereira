import {
  type AnyPgColumn,
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { createdAt, seededId, timestamps } from "../columns";

/**
 * `@repo/catalog`'s tables — ADR-0012's vocabulary and ADR-0002's municipalities.
 *
 * Four kinds of row and one join table. **A Skill is a capability, never an occupation**, and the
 * taxonomy is **flat**: a Skill Group is a heading you browse under, never a second level, never
 * stored on a Publication and never an input to matching. A Denomination is a job title as
 * Colombians say it — a way *into* the vocabulary, not part of it.
 *
 * **Every row here is `impersonal`** (ADR-0034): reference data with no Titular behind it. The
 * declarations are in `../lifecycle.ts`, as they are for every table.
 *
 * Three columns repeat across the searchable tables and each is deliberate:
 *
 * - **`search_text` is written on write, in application code** (ADR-0014 as amended by ADR-0031),
 *   lowercased and unaccented by `@repo/catalog`'s own normaliser, with a `pg_trgm` GIN index over
 *   it. That is what keeps ADR-0014's promise that **`unaccent` never runs in a query** — the
 *   extension exists for the seed's benefit and never appears in a predicate.
 * - **`is_retired` + `superseded_by_id` is retirement, and there is no delete** (ADR-0012). Existing
 *   links keep resolving and retired terms leave the picker but not history; deleting would silently
 *   strip skills from published profiles. This is not ADR-0008's banned soft delete: these are
 *   seeded reference rows with no Titular, and `retired` is vocabulary lifecycle. ADR-0012 spells
 *   the pair `retired` / `superseded_by`; ADR-0008's naming rules spell it `is_retired` (booleans
 *   take `is_`) and `superseded_by_id` (a foreign key carries `_id`).
 * - **`cuoc_code` is a mapping, never an identity** (ADR-0012). The slug is ours. Binding identity
 *   to DANE's numbering would turn their renumbering into our migration across every Publication.
 */

/**
 * A heading Skills are browsed under — _Cocina y alimentos_, _Ventas y atención al cliente_.
 *
 * **Browsing scaffolding and nothing else.** It is never stored on a Publication, never searched on
 * and never an input to matching, which is why it carries no `search_text`: the picker searches
 * Skills and Denominations, and a Group is what the result is filed under.
 */
export const skillGroups = pgTable(
  "skill_groups",
  {
    id: seededId(),
    /** Ours, Spanish, unaccented, kebab-case (ADR-0012). Not an ADR-0001 breach: the route is English. */
    slug: text().notNull(),
    /** The Spanish label a person reads. */
    name: text().notNull(),
    /** Browse order. Groups are read as a list, and alphabetical is not the order we want. */
    position: integer().notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex("skill_groups_slug_key").on(table.slug)],
);

/** Something a Person is willing to do. The only key search and matching run on (ADR-0012). */
export const skills = pgTable(
  "skills",
  {
    id: seededId(),
    /** The identity of a Skill everywhere outside the database (ADR-0003): `atencion-al-cliente`. */
    slug: text().notNull(),
    name: text().notNull(),
    /** Lowercased and unaccented on write. Never computed in a query — see the file header. */
    searchText: text().notNull(),
    /** Exactly one Group per Skill (ADR-0012). Multi-membership is a hierarchy in disguise. */
    skillGroupId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => skillGroups.id, { onDelete: "restrict" }),
    isRetired: boolean().notNull().default(false),
    /** Null means: not retired, or retired with nothing named to replace it (ADR-0012). */
    supersededById: bigint({ mode: "bigint" }).references((): AnyPgColumn => skills.id, {
      onDelete: "restrict",
    }),
    /** Null means: no CUOC term maps to this one. A mapping, never the identity (ADR-0012). */
    cuocCode: text(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("skills_slug_key").on(table.slug),
    // ADR-0014's typo tolerance, and the reason `pg_trgm` is installed at all.
    index("skills_search_text_trgm_idx").using("gin", table.searchText.op("gin_trgm_ops")),
    // ADR-0008: every foreign key column is indexed.
    index("skills_skill_group_id_idx").on(table.skillGroupId),
    index("skills_superseded_by_id_idx").on(table.supersededById),
  ],
);

/**
 * A job title as Colombians actually say it — `niñera`, `mesero`, `domiciliario`.
 *
 * Reached **inside search, never as the first question** (ADR-0023): typing one returns it beside
 * the individual Skills, and choosing it adds the Skills it implies for the Person to prune. It is
 * never stored on a Publication and never matched on.
 */
export const denominations = pgTable(
  "denominations",
  {
    id: seededId(),
    slug: text().notNull(),
    name: text().notNull(),
    searchText: text().notNull(),
    isRetired: boolean().notNull().default(false),
    /** Null means: not retired, or retired with nothing named to replace it. */
    supersededById: bigint({ mode: "bigint" }).references((): AnyPgColumn => denominations.id, {
      onDelete: "restrict",
    }),
    /** Null means: authored by us rather than taken from CUOC's 14,462 *denominaciones*. */
    cuocCode: text(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("denominations_slug_key").on(table.slug),
    index("denominations_search_text_trgm_idx").using("gin", table.searchText.op("gin_trgm_ops")),
    index("denominations_superseded_by_id_idx").on(table.supersededById),
  ],
);

/**
 * The bundle of Skills a Denomination implies.
 *
 * The composite primary key is `(denomination_id, skill_id)` because that is the query — _given this
 * title, which Skills does it offer?_ — and it gives `denomination_id` its index for free (ADR-0008).
 * `skill_id` gets its own, as the other half of that rule.
 */
export const denominationSkills = pgTable(
  "denomination_skills",
  {
    denominationId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => denominations.id, { onDelete: "restrict" }),
    skillId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    // Append-only: a link is added or removed, never edited, and the absence of `updated_at` is how
    // ADR-0008 says so.
    ...createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.denominationId, table.skillId] }),
    index("denomination_skills_skill_id_idx").on(table.skillId),
  ],
);

/**
 * A Colombian municipality, identified by its DANE DIVIPOLA code.
 *
 * **The code is `text`, because `05` ≠ `5`** — Antioquia's leading zero is part of the code and an
 * integer column eats it (ADR-0012).
 *
 * The table is unbounded and the seed is not: v1 loads Pereira, Dosquebradas and Santa Rosa de Cabal
 * and nothing else, because a seeded municipality is a promise that someone is hiring there
 * (ADR-0012 as amended by issue #74). Nothing in this shape knows that — widening is rows, never a
 * migration.
 *
 * The department rides on the row rather than in a table of its own. ADR-0014's middle location tier
 * is _same department_, which this answers with an equality on `department_code`; a `departments`
 * table would earn its keep the day something hangs off a department, and nothing does.
 */
export const municipalities = pgTable(
  "municipalities",
  {
    id: seededId(),
    /** DANE DIVIPOLA, five digits, leading zero included: `66001` is Pereira. */
    divipolaCode: text().notNull(),
    name: text().notNull(),
    searchText: text().notNull(),
    /** The first two digits of the DIVIPOLA code: `66` is Risaralda. */
    departmentCode: text().notNull(),
    departmentName: text().notNull(),
    /**
     * The seat's coordinates. Kept because they ship with the same free dataset and keep a radius
     * available later without touching a single Publication row — ADR-0012 refused radius matching
     * for Risaralda's mountains, not the coordinates.
     */
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("municipalities_divipola_code_key").on(table.divipolaCode),
    index("municipalities_search_text_trgm_idx").using("gin", table.searchText.op("gin_trgm_ops")),
    index("municipalities_department_code_idx").on(table.departmentCode),
  ],
);
