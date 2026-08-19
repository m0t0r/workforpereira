export { getDb, type Db, type Tx } from "./client";
// ADR-0034: read by `lifecycle.invariant.test.ts`, and by the generator that writes the published
// retention schedule in the *política* (ADR-0021) — so the document and the code cannot drift.
export {
  ERASURE_CLASSIFICATIONS,
  lifecycle,
  schemaTableNames,
  type ErasureClassification,
  type Lifecycle,
} from "./lifecycle";
// The rules behind `pnpm db:check`, exported so they are testable at a seam ADR-0017 allows. The
// gate itself is `scripts/db-check.ts`.
export {
  concurrentIndexViolation,
  destructiveMarker,
  destructiveStatements,
  destructiveViolations,
  editedMigrationViolations,
  journalViolations,
  type JournalEntry,
  type Violation,
} from "./migration-gate";
