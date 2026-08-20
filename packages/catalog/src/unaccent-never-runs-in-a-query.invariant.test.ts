/**
 * **Invariant Test — ADR-0014, as amended by ADR-0031.**
 *
 * _"The typeahead normalises on write, so `unaccent` never runs in a query."_
 *
 * The promise is about the **query plan**, not the answer: `unaccent()` in a predicate returns the
 * right rows and cannot use the `pg_trgm` index under it, so a correct result proves nothing. This
 * asserts on the SQL that is emitted, which is why `typeaheadQueries` is a pure function of the term
 * — it renders with no database, and it is the *same* value `searchCatalog` and
 * `searchMunicipalities` hand to the driver, not a copy of it.
 *
 * Weakening this means amending ADR-0014. The alternative it forbids — `unaccent()` in the
 * predicate — is the reflex, so the guard is worth more than the line count.
 */

import { PgDialect } from "drizzle-orm/pg-core";

import { typeaheadQueries } from "./index";

// The same `casing` the runtime handle is built with in `@repo/db`'s `client.ts`. Without it the
// dialect renders `"searchText"` and this file would be asserting on SQL nobody ever runs.
const dialect = new PgDialect({ casing: "snake_case" });

/** Every query the package emits that reads `search_text`, for a term with accents in it. */
const emitted = Object.entries(typeaheadQueries("Atención al niño", 10)).map(([name, query]) => ({
  name,
  sql: dialect.sqlToQuery(query).sql,
}));

describe("the typeahead's emitted SQL", () => {
  it("covers the three searchable lists and nothing is missing", () => {
    // Skills, Denominations and Municipalities — ADR-0014's three seeded lists. A fourth searchable
    // table would have to appear here, which is the point of asserting the shape.
    expect(emitted.map((query) => query.name).sort()).toEqual([
      "denominations",
      "municipalities",
      "skills",
    ]);
  });

  it.each(emitted)("never calls unaccent — $name", ({ sql }) => {
    expect(sql).not.toMatch(/unaccent/i);
  });

  it.each(emitted)("reads the precomputed column instead — $name", ({ sql }) => {
    // Without this the assertion above would pass just as well against a query that had stopped
    // matching on text at all.
    expect(sql).toMatch(/"search_text"/);
  });

  it.each(emitted)("passes the term as a parameter, already normalised — $name", ({ sql }) => {
    // The accented term never reaches Postgres: `toSearchText` runs first, in application code.
    expect(sql).not.toMatch(/Atención/);
    expect(sql).toMatch(/\$\d/);
  });
});
