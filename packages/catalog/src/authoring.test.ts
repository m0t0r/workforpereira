import { skills } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { eq } from "drizzle-orm";

import { givenACatalog } from "./fixtures";
import {
  authorDenomination,
  authorSkill,
  denominationSlug,
  listSkillGroups,
  retireDenomination,
  retireSkill,
  searchCatalog,
  skillGroupSlug,
  skillSlug,
} from "./index";

/** Integration: every function here takes a `Db | Tx` (ADR-0017), and none of them is mocked. */

describe("authorSkill", () => {
  it(
    "derives the slug and writes search_text, so a term authored at runtime is searchable at once",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      const authored = await authorSkill(tx, {
        name: "Reparación de electrodomésticos",
        group: skillGroupSlug("cocina-y-alimentos"),
      });
      expect(authored.slug).toBe("reparacion-de-electrodomesticos");

      const [row] = await tx
        .select({ searchText: skills.searchText })
        .from(skills)
        .where(eq(skills.slug, authored.slug));
      expect(row?.searchText).toBe("reparacion de electrodomesticos");

      // ADR-0031's whole point: no seed run stands between authoring a term and finding it, and
      // someone typing without accents finds it anyway.
      expect((await searchCatalog(tx, "electrodomesticos")).map((match) => match.name)).toContain(
        "Reparación de electrodomésticos",
      );
    }),
  );

  it(
    "files the Skill under the Group it names",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await authorSkill(tx, { name: "Repostería", group: skillGroupSlug("cocina-y-alimentos") });

      const groups = await listSkillGroups(tx);
      expect(groups[0]?.skills.map((skill) => skill.name)).toEqual(["Cocina casera", "Repostería"]);
    }),
  );

  it(
    "refuses a Group that does not exist",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await expect(
        authorSkill(tx, { name: "Soldadura", group: skillGroupSlug("metalmecanica") }),
      ).rejects.toThrow(/No Skill Group with slug "metalmecanica"/);
    }),
  );

  it(
    "refuses a second term with the same slug",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await expect(
        authorSkill(tx, { name: "Cocina casera", group: skillGroupSlug("cocina-y-alimentos") }),
      ).rejects.toThrow();
    }),
  );
});

describe("authorDenomination", () => {
  it(
    "links the Skills the title implies and offers them in search",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      await authorDenomination(tx, {
        name: "Cocinera",
        implies: [skillSlug("cocina-casera")],
      });

      const [match] = await searchCatalog(tx, "cocinera");
      expect(match).toEqual({
        kind: "denomination",
        slug: "cocinera",
        name: "Cocinera",
        skillCount: 1,
      });
    }),
  );

  it(
    "counts a Skill named twice once, rather than dying on a duplicate link",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      await authorDenomination(tx, {
        name: "Cajera",
        implies: [skillSlug("manejo-de-caja"), skillSlug("manejo-de-caja")],
      });

      const [match] = await searchCatalog(tx, "cajera");
      expect(match).toEqual({
        kind: "denomination",
        slug: "cajera",
        name: "Cajera",
        skillCount: 1,
      });
    }),
  );

  it(
    "refuses to point at a Skill that is not in the vocabulary",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await expect(
        authorDenomination(tx, { name: "Astronauta", implies: [skillSlug("vuelo-espacial")] }),
      ).rejects.toThrow(/No Skill with slug "vuelo-espacial"/);
    }),
  );
});

describe("retireSkill", () => {
  it(
    "sets is_retired, keeps the row, and deletes nothing",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      const before = await tx.$count(skills);

      await retireSkill(tx, skillSlug("manejo-de-caja"));

      expect(await tx.$count(skills)).toBe(before);
      const [row] = await tx
        .select({ isRetired: skills.isRetired, supersededById: skills.supersededById })
        .from(skills)
        .where(eq(skills.slug, "manejo-de-caja"));
      expect(row).toEqual({ isRetired: true, supersededById: null });
    }),
  );

  it(
    "records what replaced the term when there is one",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      await retireSkill(tx, skillSlug("manejo-de-caja"), {
        supersededBy: skillSlug("atencion-al-cliente"),
      });

      const [retired] = await tx
        .select({ supersededById: skills.supersededById })
        .from(skills)
        .where(eq(skills.slug, "manejo-de-caja"));
      const [replacement] = await tx
        .select({ id: skills.id })
        .from(skills)
        .where(eq(skills.slug, "atencion-al-cliente"));

      expect(retired?.supersededById).toBe(replacement?.id);
    }),
  );

  it(
    "keeps a pointer it already recorded when retirement is replayed",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      await retireSkill(tx, skillSlug("manejo-de-caja"), {
        supersededBy: skillSlug("atencion-al-cliente"),
      });
      // The replay a retirement list produces: same term, no replacement named. It must not read
      // as "this term was superseded by nothing".
      await retireSkill(tx, skillSlug("manejo-de-caja"));

      const [row] = await tx
        .select({ supersededById: skills.supersededById })
        .from(skills)
        .where(eq(skills.slug, "manejo-de-caja"));
      expect(row?.supersededById).not.toBeNull();
    }),
  );

  it(
    "refuses a replacement that does not exist, and writes nothing",
    withRollback(async (tx) => {
      await givenACatalog(tx);

      await expect(
        retireSkill(tx, skillSlug("manejo-de-caja"), {
          supersededBy: skillSlug("caja-registradora"),
        }),
      ).rejects.toThrow(/No Skill with slug "caja-registradora"/);

      const [row] = await tx
        .select({ isRetired: skills.isRetired })
        .from(skills)
        .where(eq(skills.slug, "manejo-de-caja"));
      expect(row?.isRetired).toBe(false);
    }),
  );

  it(
    "refuses a term that supersedes itself",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await expect(
        retireSkill(tx, skillSlug("manejo-de-caja"), { supersededBy: skillSlug("manejo-de-caja") }),
      ).rejects.toThrow(/cannot supersede itself/);
    }),
  );

  it(
    "refuses a term that is not there",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      await expect(retireSkill(tx, skillSlug("soldadura"))).rejects.toThrow(
        /No Skill with slug "soldadura"/,
      );
    }),
  );
});

describe("retireDenomination", () => {
  it(
    "takes the title out of search and keeps its row and its links",
    withRollback(async (tx) => {
      await givenACatalog(tx);
      expect((await searchCatalog(tx, "mesero")).map((match) => match.name)).toContain("Mesero");

      await retireDenomination(tx, denominationSlug("mesero"), {
        supersededBy: denominationSlug("ninera"),
      });

      expect((await searchCatalog(tx, "mesero")).map((match) => match.name)).not.toContain(
        "Mesero",
      );
      // The Skills it implied are untouched — retiring a way *into* the vocabulary says nothing
      // about the vocabulary.
      expect((await searchCatalog(tx, "caja")).map((match) => match.name)).toContain(
        "Manejo de caja",
      );
    }),
  );
});
