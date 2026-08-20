/**
 * The normaliser ADR-0014's promise rests on.
 *
 * Colombians type `atencion` and `nino`. The reflex is `unaccent()` in the predicate over a
 * `pg_trgm` index — and this repo refuses it, because the same normalisation done **here, in
 * application code**, is exact, testable without a database, and identical in Postgres, in PGlite
 * and in a browser. ADR-0031 moved the moment it runs from seed time to write time; it did not move
 * the place.
 *
 * The one rule that makes it work: **the same function runs over the stored term and over what the
 * person typed.** Anything it discards is discarded on both sides, so the two can only ever be
 * compared like for like.
 */

/**
 * Everything that is not an unaccented letter or a digit becomes a space, which is what keeps `%`
 * and `_` out of a `LIKE` pattern by construction rather than by escaping.
 */
const NOT_SEARCHABLE = /[^a-z0-9]+/g;

/** The combining marks `normalize("NFD")` splits an accented letter into. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * The stored `search_text`, and the query term: lowercased, unaccented, punctuation flattened to
 * single spaces, trimmed.
 *
 * `ñ` becomes `n` deliberately. It is not a decoration in Spanish, but this column is not Spanish —
 * it is a matching surface for someone typing on a phone keyboard in a hurry, and `ninera` finding
 * `Niñera` is the entire point. The displayed name keeps its `ñ`; nothing renders this column.
 */
export function toSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NOT_SEARCHABLE, " ")
    .trim();
}

/**
 * The identity of a Skill, a Skill Group, a Denomination — Spanish, unaccented, kebab-case
 * (ADR-0012): `atencion-al-cliente`.
 *
 * **Ours, and never an external code.** A CUOC number rides along in `cuoc_code` as a mapping;
 * binding identity to DANE's numbering would turn their renumbering into our migration across every
 * Publication. Not an ADR-0001 breach either: the route is English (`/skills/…`) and the slug is
 * seeded reference data, the same category as a municipality named `PEREIRA`.
 */
export function toSlug(value: string): string {
  const searchable = toSearchText(value);
  return searchable === "" ? "" : searchable.split(" ").join("-");
}
