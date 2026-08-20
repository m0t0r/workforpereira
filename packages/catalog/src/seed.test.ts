import { municipalities, skills } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { eq } from "drizzle-orm";

import { FIXTURE_CATALOG, givenACatalog } from "./fixtures";
import { CATALOG_SEED, MUNICIPALITIES, searchMunicipalities, seedCatalog } from "./index";

/**
 * Integration: `seedCatalog` takes a `Db | Tx` (ADR-0017). The shape being asserted is the one
 * `pnpm db:seed` runs — the CLI adds a pool, a transaction and some printing, and nothing else.
 */

describe("the authored seed", () => {
  it("is three municipalities and nothing else (ADR-0012 as amended by issue #74)", () => {
    expect(CATALOG_SEED.municipalities.map((row) => row.divipolaCode)).toEqual([
      "66001",
      "66170",
      "66682",
    ]);
    expect(MUNICIPALITIES.map((row) => row.name)).toEqual([
      "Pereira",
      "Dosquebradas",
      "Santa Rosa de Cabal",
    ]);
  });

  it("carries every code as text with its two-digit department prefix", () => {
    for (const row of MUNICIPALITIES) {
      expect(row.divipolaCode).toMatch(/^\d{5}$/);
      expect(row.divipolaCode.startsWith(row.departmentCode)).toBe(true);
      expect(row.departmentName).toBe("Risaralda");
    }
  });

  it("carries a centroid for each of them", () => {
    for (const row of MUNICIPALITIES) {
      expect(row.latitude).toBeGreaterThan(4);
      expect(row.latitude).toBeLessThan(5);
      expect(row.longitude).toBeLessThan(-75);
      expect(row.longitude).toBeGreaterThan(-76);
    }
  });

  it("has no vocabulary yet, and says so rather than shipping a guess (issue #75)", () => {
    expect(CATALOG_SEED.skills).toEqual([]);
    expect(CATALOG_SEED.skillGroups).toEqual([]);
    expect(CATALOG_SEED.denominations).toEqual([]);
  });
});

/** The first seeded municipality, without a non-null assertion in every test that wants it. */
function pereira() {
  const [first] = MUNICIPALITIES;
  if (!first) throw new Error("The seed is empty, which the test above should have caught first.");
  return first;
}

describe("seedCatalog", () => {
  it(
    "loads the three municipalities with their codes and centroids",
    withRollback(async (tx) => {
      const report = await seedCatalog(tx, CATALOG_SEED);
      expect(report.municipalities).toEqual({ inserted: 3, updated: 0, unchanged: 0 });

      const rows = await tx
        .select({
          divipolaCode: municipalities.divipolaCode,
          name: municipalities.name,
          searchText: municipalities.searchText,
          departmentCode: municipalities.departmentCode,
          latitude: municipalities.latitude,
          longitude: municipalities.longitude,
        })
        .from(municipalities)
        .orderBy(municipalities.divipolaCode);

      expect(rows).toEqual([
        {
          divipolaCode: "66001",
          name: "Pereira",
          searchText: "pereira",
          departmentCode: "66",
          latitude: 4.8133,
          longitude: -75.6961,
        },
        {
          divipolaCode: "66170",
          name: "Dosquebradas",
          searchText: "dosquebradas",
          departmentCode: "66",
          latitude: 4.8339,
          longitude: -75.6761,
        },
        {
          divipolaCode: "66682",
          name: "Santa Rosa de Cabal",
          searchText: "santa rosa de cabal",
          departmentCode: "66",
          latitude: 4.8695,
          longitude: -75.6214,
        },
      ]);
    }),
  );

  it(
    "is idempotent: a second run changes no row and adds no fourth",
    withRollback(async (tx) => {
      await seedCatalog(tx, CATALOG_SEED);
      const second = await seedCatalog(tx, CATALOG_SEED);

      expect(second.municipalities).toEqual({ inserted: 0, updated: 0, unchanged: 3 });
      expect(await tx.$count(municipalities)).toBe(3);
    }),
  );

  it(
    "updates a changed label in place rather than inserting beside it",
    withRollback(async (tx) => {
      await seedCatalog(tx, CATALOG_SEED);

      const renamed = {
        ...CATALOG_SEED,
        municipalities: CATALOG_SEED.municipalities.map((row) =>
          row.divipolaCode === "66001" ? { ...row, name: "Pereirá" } : row,
        ),
      };
      const report = await seedCatalog(tx, renamed);

      expect(report.municipalities).toEqual({ inserted: 0, updated: 1, unchanged: 2 });
      expect(await tx.$count(municipalities)).toBe(3);
      // The `search_text` follows the label, on the same write.
      expect((await searchMunicipalities(tx, "pereira"))[0]?.name).toBe("Pereirá");
    }),
  );

  it(
    "writes search_text for every term it loads",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      const rows = await tx
        .select({ searchText: skills.searchText, name: skills.name })
        .from(skills);
      expect(rows).toHaveLength(FIXTURE_CATALOG.skills.length);
      for (const row of rows) expect(row.searchText).not.toBe("");

      const [nino] = await tx
        .select({ searchText: skills.searchText })
        .from(skills)
        .where(eq(skills.slug, "cuidado-de-ninos"));
      expect(nino?.searchText).toBe("cuidado de ninos");
    }),
  );

  it(
    "links a Denomination to the Skills it implies, and only links them once",
    withRollback(async (tx) => {
      const first = await seedCatalog(tx, FIXTURE_CATALOG);
      expect(first.denominationSkills).toEqual({ linked: 3, unlinked: 0 });

      const second = await seedCatalog(tx, FIXTURE_CATALOG);
      expect(second.denominationSkills).toEqual({ linked: 0, unlinked: 0 });
    }),
  );

  it(
    "replaces a bundle the seed no longer claims, without touching either term",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      const narrowed = {
        ...FIXTURE_CATALOG,
        denominations: FIXTURE_CATALOG.denominations.map((row) =>
          row.slug === "mesero" ? { ...row, implies: ["atencion-al-cliente"] } : row,
        ),
      };
      const report = await seedCatalog(tx, narrowed);

      expect(report.denominationSkills).toEqual({ linked: 0, unlinked: 1 });
      expect(await tx.$count(skills)).toBe(FIXTURE_CATALOG.skills.length);
    }),
  );

  it(
    "refuses a DIVIPOLA code that is not five digits",
    withRollback(async (tx) => {
      const bad = {
        ...CATALOG_SEED,
        municipalities: [{ ...pereira(), divipolaCode: "6601" }],
      };
      await expect(seedCatalog(tx, bad)).rejects.toThrow(/not a DIVIPOLA code/);
    }),
  );

  it(
    "refuses a department code the DIVIPOLA code does not start with",
    withRollback(async (tx) => {
      const bad = {
        ...CATALOG_SEED,
        municipalities: [{ ...pereira(), departmentCode: "05" }],
      };
      await expect(seedCatalog(tx, bad)).rejects.toThrow(/does not start with department code/);
    }),
  );

  it(
    "refuses coordinates outside Colombia, which is what a swapped pair looks like",
    withRollback(async (tx) => {
      const bad = {
        ...CATALOG_SEED,
        municipalities: [{ ...pereira(), latitude: -75.6961, longitude: 4.8133 }],
      };
      await expect(seedCatalog(tx, bad)).rejects.toThrow(/is not in Colombia/);
    }),
  );

  it(
    "refuses a Skill filed under a Group that is not in the seed",
    withRollback(async (tx) => {
      const bad = {
        ...FIXTURE_CATALOG,
        skills: [{ slug: "soldadura", name: "Soldadura", group: "metalmecanica" }],
      };
      await expect(seedCatalog(tx, bad)).rejects.toThrow(/which is not seeded/);
    }),
  );
});
