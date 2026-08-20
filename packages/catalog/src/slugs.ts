import { toSlug } from "./text";

/**
 * Four identities that are all strings and none of which are interchangeable.
 *
 * ADR-0012 makes a Skill Group **browsing scaffolding — never stored on a Publication, never
 * searched on, never an input to matching**. That rule has to survive contact with a codebase where
 * a Skill and a Skill Group are both `{ slug, name }`, and a comment saying "don't" is not a
 * mechanism. Branding the slug makes attaching a Group to a Publication a **compile error** at the
 * one place it could ever happen — see `skill-groups-are-not-matchable.invariant.test.ts`.
 *
 * The brand is a phantom: at runtime every one of these is the string it looks like, so a slug
 * crosses to the database, to JSON and to a URL segment untouched.
 */

declare const brand: unique symbol;

type Branded<Name extends string> = string & { readonly [brand]: Name };

/** `atencion-al-cliente` — the identity of a Skill everywhere outside the database (ADR-0003). */
export type SkillSlug = Branded<"SkillSlug">;

/** `cocina-y-alimentos` — a heading in the picker, and nothing a Publication can hold. */
export type SkillGroupSlug = Branded<"SkillGroupSlug">;

/** `mesero` — a way *into* the vocabulary. Never stored on a Publication either (ADR-0012). */
export type DenominationSlug = Branded<"DenominationSlug">;

/** `66001` — DANE DIVIPOLA, text because `05` ≠ `5` (ADR-0012). */
export type DivipolaCode = Branded<"DivipolaCode">;

/**
 * The shape rule, applied. It says nothing about whether the term exists — that question needs the
 * database, and every function here that reads one takes a handle.
 */
function assertSlugShape(value: string, kind: string): void {
  if (value === "" || toSlug(value) !== value) {
    throw new Error(
      `"${value}" is not a ${kind} slug: slugs are lowercase, unaccented and kebab-case (ADR-0012).`,
    );
  }
}

export function skillSlug(value: string): SkillSlug {
  assertSlugShape(value, "Skill");
  return value as SkillSlug;
}

export function skillGroupSlug(value: string): SkillGroupSlug {
  assertSlugShape(value, "Skill Group");
  return value as SkillGroupSlug;
}

export function denominationSlug(value: string): DenominationSlug {
  assertSlugShape(value, "Denomination");
  return value as DenominationSlug;
}

/** Five digits, leading zero and all. Nothing else is a DIVIPOLA code. */
export function divipolaCode(value: string): DivipolaCode {
  if (!/^\d{5}$/.test(value)) {
    throw new Error(`"${value}" is not a DIVIPOLA code: five digits, leading zero included.`);
  }
  return value as DivipolaCode;
}
