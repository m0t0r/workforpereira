#!/usr/bin/env tsx
import { getDb } from "@repo/db";

import { CATALOG_SEED } from "../src/data/index.ts";
import { seedCatalog } from "../src/seed.ts";

/**
 * `pnpm db:seed` — load the authored catalog into the database.
 *
 * The CLI half of the seed. Everything that decides *what a row should be* lives in `src/seed.ts`,
 * where an integration test can reach it; only the pool singleton, the printing and the exit code
 * live here — the same split `scripts/db-check.ts` uses in `@repo/db`, and for the same reason.
 *
 * **It is safe to run again, and it is meant to be**: `pnpm bootstrap` runs it, `pnpm db:reset` runs
 * it, and the deploy runs it right after `pnpm db:migrate` (ADR-0022). A second run reports
 * everything unchanged and writes nothing.
 *
 * `tsx` rather than plain `node`: ADR-0006 makes every `@repo/*` package JIT with
 * `moduleResolution: Bundler`, so `@repo/db`'s own relative imports carry no extension and Node's
 * ESM resolver cannot follow them.
 *
 * One transaction for the whole seed. A Denomination's bundle points at Skills inserted moments
 * earlier, and a run that fails half way through must not leave a Denomination whose Skills were
 * rolled back.
 */

const report = await getDb().transaction((tx) => seedCatalog(tx, CATALOG_SEED));

const line = (label: string, count: { inserted: number; updated: number; unchanged: number }) =>
  `${label.padEnd(14)} ${String(count.inserted).padStart(5)} inserted  ` +
  `${String(count.updated).padStart(5)} updated  ${String(count.unchanged).padStart(5)} unchanged\n`;

process.stdout.write(line("skill groups", report.skillGroups));
process.stdout.write(line("skills", report.skills));
process.stdout.write(line("denominations", report.denominations));
process.stdout.write(line("municipalities", report.municipalities));
process.stdout.write(
  `${"skill bundles".padEnd(14)} ${String(report.denominationSkills.linked).padStart(5)} linked   ` +
    `${String(report.denominationSkills.unlinked).padStart(5)} unlinked\n`,
);

// The pool keeps the process alive otherwise, and a seed that hangs looks like a seed that failed.
process.exit(0);
