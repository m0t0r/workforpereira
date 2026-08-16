/**
 * Every table in the system, grouped by owning module (ADR-0006).
 *
 * The schema is *central* rather than per-module because Drizzle's relations API defeats the
 * split in both generations — see ADR-0006, "Why the schema is central". Ownership stays legible
 * through one file per owner (`./auth.ts`, `./catalog.ts`, `./people.ts`, …), re-exported here.
 *
 * Empty by design: no table has been designed yet. The tables land with the implementation
 * tickets that follow this map, under the conventions ADR-0008 fixes (plural tables, singular
 * columns, `timestamptz` everywhere, hard deletes, `RESTRICT` by default).
 */

export {};
