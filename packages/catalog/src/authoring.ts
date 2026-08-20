import type { Db, Tx } from "@repo/db";
import { denominations, denominationSkills, skillGroups, skills } from "@repo/db/schema";
import { eq, inArray } from "drizzle-orm";

import type { SkillView } from "./search";
import {
  denominationSlug,
  skillSlug,
  type DenominationSlug,
  type SkillGroupSlug,
  type SkillSlug,
} from "./slugs";
import { toSearchText, toSlug } from "./text";

/**
 * Authoring and retirement — the writes ADR-0031 opened up.
 *
 * ADR-0006 called `@repo/catalog` _"seeded, read-only at runtime"_ and ADR-0031 reversed that: the
 * Skill Suggestion queue **abolishes seed time**, so a vocabulary designed to grow continuously
 * cannot need a release per word. Two things follow, and both live here:
 *
 * - **`search_text` is computed on write**, by the same normaliser the seed uses. A term authored at
 *   two in the morning through the operator surface is searchable in the same breath, and ADR-0014's
 *   promise that `unaccent` never runs in a query is kept by construction rather than by a seed run.
 * - **A term is retired, never deleted** (ADR-0012). `is_retired` plus an optional `superseded_by_id`
 *   pointer: existing links keep resolving, and a Publication that claimed the term keeps claiming
 *   it. Deleting would silently strip skills from published profiles — the worst possible thing to
 *   fail at quietly, in a product whose whole purpose is being findable.
 *
 * What is **not** here is the judgement. ADR-0012's proxy rule — _a term names something you do,
 * never something you are_ — is an art. 5 discrimination sieve applied by a person before they type,
 * and no function in this file can tell `atención al cliente` from `líder sindical`.
 */

export interface AuthorSkillInput {
  /** The Spanish label a person reads. The slug and `search_text` are derived from it. */
  name: string;
  group: SkillGroupSlug;
  /** DANE's code for the nearest CUOC term, where there is one. A mapping, never the identity. */
  cuocCode?: string;
}

export interface AuthorDenominationInput {
  name: string;
  /** The Skills this title implies, which the Person then prunes (ADR-0023). */
  implies: readonly SkillSlug[];
  cuocCode?: string;
}

/**
 * What a retirement records: the term leaves the picker, and may name what replaced it.
 *
 * **Absent means "say nothing", not "clear it".** Retiring a term that already points at its
 * replacement must not drop that pointer, because the pointer is what keeps an old link resolving to
 * something useful — and re-retiring is exactly the operation someone performs by accident.
 */
export interface RetireSkillOptions {
  supersededBy?: SkillSlug;
}

export interface RetireDenominationOptions {
  supersededBy?: DenominationSlug;
}

async function denominationIdBySlug(db: Db | Tx, slug: DenominationSlug): Promise<bigint> {
  const [row] = await db
    .select({ id: denominations.id })
    .from(denominations)
    .where(eq(denominations.slug, slug))
    .limit(1);
  if (!row) throw new Error(`No Denomination with slug "${slug}".`);
  return row.id;
}

async function skillGroupId(db: Db | Tx, slug: SkillGroupSlug): Promise<bigint> {
  const [group] = await db
    .select({ id: skillGroups.id })
    .from(skillGroups)
    .where(eq(skillGroups.slug, slug))
    .limit(1);
  if (!group) throw new Error(`No Skill Group with slug "${slug}".`);
  return group.id;
}

async function skillIdsBySlug(
  db: Db | Tx,
  slugs: readonly SkillSlug[],
): Promise<Map<string, bigint>> {
  if (slugs.length === 0) return new Map();
  const rows = await db
    .select({ id: skills.id, slug: skills.slug })
    .from(skills)
    .where(inArray(skills.slug, [...slugs]));
  const found = new Map(rows.map((row) => [row.slug, row.id]));
  const missing = slugs.filter((slug) => !found.has(slug));
  if (missing.length > 0) {
    throw new Error(`No Skill with slug ${missing.map((slug) => `"${slug}"`).join(", ")}.`);
  }
  return found;
}

/**
 * Author one Skill.
 *
 * The slug is derived from the name and is then **frozen**: renaming a term later changes what a
 * person reads and not what a URL, a Publication or a CUOC mapping points at (ADR-0003, ADR-0012).
 * A duplicate slug is refused by the unique index rather than by a check here, because a check here
 * would be a race.
 */
export async function authorSkill(db: Db | Tx, input: AuthorSkillInput): Promise<SkillView> {
  const slug = toSlug(input.name);
  if (slug === "") throw new Error("A Skill needs a name with at least one letter or digit in it.");

  const [row] = await db
    .insert(skills)
    .values({
      slug,
      name: input.name,
      searchText: toSearchText(input.name),
      skillGroupId: await skillGroupId(db, input.group),
      cuocCode: input.cuocCode,
    })
    .returning({ slug: skills.slug, name: skills.name });

  if (!row) throw new Error(`Authoring the Skill "${input.name}" inserted nothing.`);
  return { slug: skillSlug(row.slug), name: row.name };
}

/**
 * Author one Denomination and the bundle of Skills it implies.
 *
 * The Skills must already exist: a title is a way *into* the vocabulary, so it can only ever point
 * at terms that are in it.
 */
export async function authorDenomination(
  db: Db | Tx,
  input: AuthorDenominationInput,
): Promise<{ slug: DenominationSlug; name: string; implies: SkillSlug[] }> {
  const slug = toSlug(input.name);
  if (slug === "") {
    throw new Error("A Denomination needs a name with at least one letter or digit in it.");
  }

  // The same Skill twice is a duplicate primary key on `denomination_skills`, and naming a term
  // twice is a thing a person does. It means the same as naming it once.
  const implies = [...new Set(input.implies)];

  // The title and its bundle are one act. Two statements outside a transaction can leave a
  // Denomination that implies nothing — visible in the picker as "añade 0 habilidades" forever,
  // because re-authoring it hits the unique slug index. `db.transaction` on a `Tx` is a savepoint,
  // so this composes with a caller that already opened one (ADR-0006: the handle is the caller's).
  return db.transaction(async (tx) => {
    const ids = await skillIdsBySlug(tx, implies);

    const [row] = await tx
      .insert(denominations)
      .values({
        slug,
        name: input.name,
        searchText: toSearchText(input.name),
        cuocCode: input.cuocCode,
      })
      .returning({ id: denominations.id, slug: denominations.slug, name: denominations.name });

    if (!row) throw new Error(`Authoring the Denomination "${input.name}" inserted nothing.`);

    if (implies.length > 0) {
      await tx.insert(denominationSkills).values(
        implies.map((skill) => {
          // `skillIdsBySlug` has already thrown for anything missing; this narrows the type.
          const skillId = ids.get(skill);
          if (skillId === undefined) throw new Error(`No Skill with slug "${skill}".`);
          return { denominationId: row.id, skillId };
        }),
      );
    }

    return { slug: denominationSlug(row.slug), name: row.name, implies };
  });
}

/**
 * Retire a Skill: it leaves the picker, keeps its row, and may point at the term that replaced it.
 *
 * **Nothing is deleted**, which is not ADR-0008's banned soft delete — `skills` is seeded reference
 * data with no Titular behind it, and `is_retired` is vocabulary lifecycle. ADR-0008's `RESTRICT`
 * default would make deleting a referenced term impossible anyway; this is what to do instead.
 */
export async function retireSkill(
  db: Db | Tx,
  slug: SkillSlug,
  options: RetireSkillOptions = {},
): Promise<void> {
  // The column is left out of the `SET` when no replacement is named, rather than set to null —
  // see `RetireSkillOptions`.
  const change: { isRetired: true; supersededById?: bigint } = { isRetired: true };

  if (options.supersededBy !== undefined) {
    if (options.supersededBy === slug) {
      throw new Error(`A Skill cannot supersede itself ("${slug}").`);
    }
    // Throws when the superseding term does not exist, before anything is written.
    const ids = await skillIdsBySlug(db, [options.supersededBy]);
    change.supersededById = ids.get(options.supersededBy);
  }

  const updated = await db
    .update(skills)
    .set(change)
    .where(eq(skills.slug, slug))
    .returning({ slug: skills.slug });

  if (updated.length === 0) throw new Error(`No Skill with slug "${slug}".`);
}

/** The same act for a Denomination, for the same reasons. */
export async function retireDenomination(
  db: Db | Tx,
  slug: DenominationSlug,
  options: RetireDenominationOptions = {},
): Promise<void> {
  const change: { isRetired: true; supersededById?: bigint } = { isRetired: true };

  if (options.supersededBy !== undefined) {
    if (options.supersededBy === slug) {
      throw new Error(`A Denomination cannot supersede itself ("${slug}").`);
    }
    change.supersededById = await denominationIdBySlug(db, options.supersededBy);
  }

  const updated = await db
    .update(denominations)
    .set(change)
    .where(eq(denominations.slug, slug))
    .returning({ slug: denominations.slug });

  if (updated.length === 0) throw new Error(`No Denomination with slug "${slug}".`);
}
