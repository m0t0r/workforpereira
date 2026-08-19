export { getDb, type Db, type Tx } from "./client";
// ADR-0003's identifier, generated in application code so it behaves identically in Postgres, in
// PGlite and in a test with no database at all. ADR-0017 names it as one of the few genuinely
// unit-testable surfaces this repo has.
export { uuidv7 } from "./uuidv7";
// ADR-0034: read by `lifecycle.invariant.test.ts`, and by the generator that writes the published
// retention schedule in the *política* (ADR-0021) — so the document and the code cannot drift.
export {
  declaredWithNoTable,
  ERASURE_CLASSIFICATIONS,
  lifecycle,
  undeclaredTables,
  type ErasureClassification,
  type Lifecycle,
} from "./lifecycle";
// The rules behind `pnpm db:check`, exported so they are testable at a seam ADR-0017 allows. The
// gate itself is `scripts/db-check.ts`.
export {
  concurrentIndexViolations,
  destructiveMarker,
  destructiveStatements,
  destructiveViolations,
  editedMigrationViolations,
  journalViolations,
  type JournalEntry,
  type Violation,
} from "./migration-gate";
