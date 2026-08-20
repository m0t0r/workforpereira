import type { MunicipalitySeed } from "../seed";

/**
 * **The launch geography: three municipalities, and nothing else.**
 *
 * ADR-0012 decided to seed all 1,122 Colombian municipalities, and issue #74 amended it. The table
 * is unbounded and the schema knows nothing about three — what narrows is this file. The reason is
 * not cost, because 1,122 free rows cost nothing: a seeded municipality is a **promise that someone
 * is hiring there**, and a Publication in Leticia would meet an empty market and teach the person
 * who wrote it that the product does not work. Better no row than a row with no one behind it.
 *
 * **Widening is this file and a deploy** — `seedCatalog` is idempotent on the DIVIPOLA code, so
 * adding Manizales is one commit and no migration.
 *
 * These three are one labour market: ADR-0012 already calls Pereira–Dosquebradas _"functionally one
 * labour market"_, and Santa Rosa de Cabal completes the conurbation that gives the product its
 * name.
 *
 * **The codes are `text` because `05` ≠ `5`** — Risaralda's `66` prefix survives here by luck rather
 * than by the column type, and Antioquia's would not.
 *
 * The coordinates are the **municipal seat** (_cabecera municipal_), to four decimals — roughly
 * eleven metres, which is finer than anything this product does with them. ADR-0012 refused radius
 * matching for Risaralda's mountains and kept the coordinates anyway, so that a later decision has
 * them without touching a single Publication row. When DANE's full dataset lands with the other
 * 1,119 municipalities, these become polygon centroids and nothing that reads them changes.
 */
export const MUNICIPALITIES: readonly MunicipalitySeed[] = [
  {
    divipolaCode: "66001",
    name: "Pereira",
    departmentCode: "66",
    departmentName: "Risaralda",
    latitude: 4.8133,
    longitude: -75.6961,
  },
  {
    divipolaCode: "66170",
    name: "Dosquebradas",
    departmentCode: "66",
    departmentName: "Risaralda",
    latitude: 4.8339,
    longitude: -75.6761,
  },
  {
    divipolaCode: "66682",
    name: "Santa Rosa de Cabal",
    departmentCode: "66",
    departmentName: "Risaralda",
    latitude: 4.8695,
    longitude: -75.6214,
  },
];
