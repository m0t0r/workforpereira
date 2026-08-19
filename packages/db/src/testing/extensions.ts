import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

/**
 * The extension bundles migration `0000_enable_extensions.sql` needs.
 *
 * ADR-0017: these must be passed at **both** `PGlite.create()` call sites — the one in
 * `global-setup.ts` that replays the migrations, and the one in `instance.ts` that restores the
 * dump per worker. `CREATE EXTENSION` in PGlite loads a WASM bundle that has to be registered
 * before the database opens; a restored data directory carries the catalog rows but not the
 * bundle, so a worker missing this list fails on the first `similarity()` or `unaccent()` call
 * rather than at startup.
 */
export const extensions = { pg_trgm, unaccent };
