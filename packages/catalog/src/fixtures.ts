import type { Tx } from "@repo/db";

import { MUNICIPALITIES } from "./data/municipalities";
import { seedCatalog, type CatalogSeed } from "./seed";

/**
 * This package's fixtures, duplicated from every other package's on purpose and forever (ADR-0017):
 * a shared fixtures package would make the test harness depend on the modules whose tests depend on
 * the harness, inverting ADR-0006's DAG.
 *
 * **Not the seed, and not a proposal for one.** The real vocabulary is authored in issue #75 under
 * ADR-0012's proxy rule; these nine rows exist because the queries need something with an `ñ`, an
 * accent, a shared word and a Denomination that implies more than one Skill. The municipalities are
 * the real three, because there are only three and inventing a fourth would be inventing a market.
 */
export const FIXTURE_CATALOG: CatalogSeed = {
  skillGroups: [
    { slug: "cocina-y-alimentos", name: "Cocina y alimentos", position: 1 },
    { slug: "ventas-y-atencion", name: "Ventas y atención al cliente", position: 2 },
    { slug: "cuidado-de-personas", name: "Cuidado de personas", position: 3 },
  ],
  skills: [
    { slug: "cocina-casera", name: "Cocina casera", group: "cocina-y-alimentos" },
    { slug: "manejo-de-caja", name: "Manejo de caja", group: "ventas-y-atencion" },
    { slug: "atencion-al-cliente", name: "Atención al cliente", group: "ventas-y-atencion" },
    { slug: "cuidado-de-ninos", name: "Cuidado de niños", group: "cuidado-de-personas" },
  ],
  denominations: [
    { slug: "mesero", name: "Mesero", implies: ["atencion-al-cliente", "manejo-de-caja"] },
    { slug: "ninera", name: "Niñera", implies: ["cuidado-de-ninos"] },
  ],
  municipalities: MUNICIPALITIES,
};

/** Load the fixtures into a test's transaction. Everything written here is rolled back. */
export async function givenACatalog(tx: Tx): Promise<void> {
  await seedCatalog(tx, FIXTURE_CATALOG);
}
