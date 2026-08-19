/**
 * **Invariant Test — ADR-0034.** Every table in the schema declares its lifecycle.
 *
 * ADR-0017 built the reflective guard and scoped it to tables with a foreign key to `persons`.
 * ADR-0034 widened it, because the foreign key was never a detector of personal data — it is a
 * *reach* mechanism, and three tables already sit outside it (`verifications`, Better Auth's
 * IP-keyed `rateLimit`, and ADR-0032's `HMAC(email)` sign-in counter). This test asks only *did
 * you declare*; `erasure.invariant.test.ts` asks *did erasure work*.
 *
 * Never weakened without amending ADR-0034.
 */

import { pgTable, text } from "drizzle-orm/pg-core";

import { declaredWithNoTable, lifecycle, undeclaredTables } from "./lifecycle";
import * as schema from "./schema/index";

describe("every table declares its lifecycle", () => {
  it("leaves no table in the schema undeclared", () => {
    expect(undeclaredTables(schema, lifecycle)).toEqual([]);
  });

  it("declares nothing that is not a table in the schema", () => {
    expect(declaredWithNoTable(schema, lifecycle)).toEqual([]);
  });

  /**
   * The schema is empty until the first implementation ticket lands a table, so the two
   * assertions above pass vacuously and would keep passing if the enumeration silently stopped
   * finding anything. These two hold the detector to its job against a synthetic schema, so the
   * guard is known to bite on the day a real table arrives.
   */
  describe("the enumeration itself", () => {
    const undeclared = pgTable("widgets", { name: text().notNull() });
    const declared = pgTable("municipalities", { name: text().notNull() });

    it("names a table that has no declaration", () => {
      expect(undeclaredTables({ undeclared }, {})).toEqual(["widgets"]);
    });

    it("accepts a table that has one", () => {
      expect(
        undeclaredTables({ declared }, { municipalities: { erasure: "impersonal", term: "none" } }),
      ).toEqual([]);
    });

    it("names a declaration with no table behind it", () => {
      expect(
        declaredWithNoTable({ declared }, { offers: { erasure: "links-severed", term: "x" } }),
      ).toEqual(["offers"]);
    });

    /** `in` would find `constructor` on `Object.prototype` and call the table declared. */
    it("does not mistake a prototype property for a declaration", () => {
      const awkward = pgTable("constructor", { name: text().notNull() });
      expect(undeclaredTables({ awkward }, {})).toEqual(["constructor"]);
    });

    it("ignores everything in the schema module that is not a table", () => {
      const STATUS = ["draft", "published"] as const;
      expect(undeclaredTables({ STATUS, helper: () => null }, {})).toEqual([]);
    });
  });
});
