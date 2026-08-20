import { withRollback } from "@repo/db/testing";

import { givenACatalog } from "./fixtures";
import {
  denominationSlug,
  listSkillGroups,
  retireSkill,
  searchCatalog,
  searchMunicipalities,
  skillSlug,
  skillsForDenomination,
} from "./index";

/**
 * Integration, on a real database: every function here takes a `Db | Tx` (ADR-0017), and the
 * typeahead is `pg_trgm` behaving like `pg_trgm` — a mock would be asserting on our own guesses
 * about an extension.
 */

const names = (results: { name: string }[]) => results.map((result) => result.name);

describe("searchCatalog", () => {
  it(
    "finds a Skill by how it starts",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "coci"))).toContain("Cocina casera");
    }),
  );

  it(
    "finds a Skill by a word inside it",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "caja"))).toContain("Manejo de caja");
    }),
  );

  it(
    "finds accented terms typed without accents — the whole reason search_text exists",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "atencion"))).toContain("Atención al cliente");
      expect(names(await searchCatalog(tx, "ninos"))).toContain("Cuidado de niños");
    }),
  );

  it(
    "finds accented terms typed with them, too",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "niños"))).toContain("Cuidado de niños");
    }),
  );

  it(
    "survives a typo, which is what the trigram index is for",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "mesreo"))).toContain("Mesero");
    }),
  );

  it(
    "returns a Denomination beside the Skills, with the number it would add (ADR-0023)",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      const [match] = await searchCatalog(tx, "mesero");
      expect(match).toEqual({
        kind: "denomination",
        slug: "mesero",
        name: "Mesero",
        skillCount: 2,
      });
    }),
  );

  it(
    "never counts a retired Skill in what a Denomination would add",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await retireSkill(tx, skillSlug("manejo-de-caja"));

      const [match] = await searchCatalog(tx, "mesero");
      expect(match).toMatchObject({ kind: "denomination", skillCount: 1 });
    }),
  );

  it(
    "leaves a retired term out of the picker",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchCatalog(tx, "cocina"))).toContain("Cocina casera");

      await retireSkill(tx, skillSlug("cocina-casera"));
      expect(names(await searchCatalog(tx, "cocina"))).not.toContain("Cocina casera");
    }),
  );

  it(
    "has nothing to say about an empty box",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(await searchCatalog(tx, "   ")).toEqual([]);
    }),
  );

  it(
    "honours a limit, and never returns more than the ceiling",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(await searchCatalog(tx, "a", { limit: 2 })).toHaveLength(2);
      expect((await searchCatalog(tx, "a", { limit: 1000 })).length).toBeLessThanOrEqual(50);
    }),
  );
});

describe("searchMunicipalities", () => {
  it(
    "finds the three seeded municipalities by name",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await searchMunicipalities(tx, "pereira"))).toEqual(["Pereira"]);
      expect(names(await searchMunicipalities(tx, "santa rosa"))).toEqual(["Santa Rosa de Cabal"]);
      expect(names(await searchMunicipalities(tx, "quebradas"))).toEqual(["Dosquebradas"]);
    }),
  );

  it(
    "returns the DIVIPOLA code as text, leading zeros intact, with its department",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      const [match] = await searchMunicipalities(tx, "pereira");
      expect(match).toEqual({
        divipolaCode: "66001",
        name: "Pereira",
        departmentCode: "66",
        departmentName: "Risaralda",
      });
    }),
  );

  it(
    "knows nothing about a municipality that was not seeded",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(await searchMunicipalities(tx, "leticia")).toEqual([]);
    }),
  );
});

describe("listSkillGroups", () => {
  it(
    "returns every Group in browse order with the Skills filed under it",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      const groups = await listSkillGroups(tx);

      expect(groups.map((group) => group.slug)).toEqual([
        "cocina-y-alimentos",
        "ventas-y-atencion",
        "cuidado-de-personas",
      ]);
      expect(names(groups[1]?.skills ?? [])).toEqual(["Atención al cliente", "Manejo de caja"]);
    }),
  );

  it(
    "drops a retired Skill from its Group but keeps the Group",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await retireSkill(tx, skillSlug("cocina-casera"));

      const groups = await listSkillGroups(tx);
      expect(groups.map((group) => group.slug)).toContain("cocina-y-alimentos");
      expect(groups[0]?.skills).toEqual([]);
    }),
  );
});

describe("skillsForDenomination", () => {
  it(
    "returns the bundle a title implies",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(names(await skillsForDenomination(tx, denominationSlug("mesero")))).toEqual([
        "Atención al cliente",
        "Manejo de caja",
      ]);
    }),
  );

  it(
    "never offers a retired Skill",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await retireSkill(tx, skillSlug("manejo-de-caja"));

      expect(names(await skillsForDenomination(tx, denominationSlug("mesero")))).toEqual([
        "Atención al cliente",
      ]);
    }),
  );

  it(
    "answers an unknown title with an empty list rather than a throw",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect(await skillsForDenomination(tx, denominationSlug("astronauta"))).toEqual([]);
    }),
  );
});
