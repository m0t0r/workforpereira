/**
 * The rules behind `pnpm db:check` (ADR-0017, ADR-0024).
 *
 * They live here, as pure functions over strings, because `scripts/db-check.ts` is the part that
 * shells out to git and to drizzle-kit and therefore cannot be tested. Everything that decides
 * *whether something is a violation* is in this file, takes no database handle, and is unit
 * tested in `migration-gate.test.ts`.
 */

/** One entry of `migrations/meta/_journal.json`. */
export interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface Violation {
  /** The migration tag, or the file path, the violation is about. */
  subject: string;
  message: string;
}

/**
 * The statements ADR-0017 calls destructive. Each is a contract step: it removes something old
 * code may still be using, and under ADR-0005's rolling deploy old and new code share one schema.
 */
const DESTRUCTIVE = [
  { label: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { label: "DROP COLUMN", pattern: /\bdrop\s+column\b/i },
  {
    label: "ALTER COLUMN … SET NOT NULL",
    pattern: /\balter\s+column\b[\s\S]*?\bset\s+not\s+null\b/i,
  },
  { label: "ALTER COLUMN … TYPE", pattern: /\balter\s+column\b[\s\S]*?\btype\b/i },
  { label: "DROP CONSTRAINT", pattern: /\bdrop\s+constraint\b/i },
  { label: "RENAME", pattern: /\brename\b/i },
] as const;

const CONCURRENT_INDEX = /\bcreate\s+(unique\s+)?index\s+concurrently\b/i;

const MARKER = /^\s*--\s*destructive:\s*completes\s+(\S+)\s*$/im;

/**
 * The migration's statements, comments stripped and split on `;` and drizzle-kit's own
 * `--> statement-breakpoint`.
 *
 * Matching per statement rather than over the whole file is not tidiness. `ALTER COLUMN … TYPE`
 * needs both words in one statement; run against the file as a whole, an additive migration that
 * happens to contain an `ALTER COLUMN … SET NOT NULL` above and a `type` anywhere below it would
 * be reported as a type change that is not there.
 */
function statements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, " ")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * The migration this one completes, from `-- destructive: completes 0014_add_nullable_x`.
 *
 * A marker costs one comment and makes the author state which expand step preceded this contract
 * step, which is the thinking the rule exists to force. A warning would be an unread line of CI
 * output.
 */
export function destructiveMarker(sql: string): string | undefined {
  return MARKER.exec(sql)?.[1];
}

/** The destructive statements a migration contains, by label. Empty for an additive migration. */
export function destructiveStatements(sql: string): string[] {
  const body = statements(sql);
  return DESTRUCTIVE.filter(({ pattern }) => body.some((statement) => pattern.test(statement))).map(
    ({ label }) => label,
  );
}

/**
 * `CREATE INDEX CONCURRENTLY` can never appear in a migration, marker or not.
 *
 * `drizzle-kit migrate` applies every pending migration inside **one** transaction (ADR-0024), and
 * Postgres refuses a concurrent index inside a transaction block with SQLSTATE 25001 — so this
 * does not fail review, it fails the deploy. A concurrent index is an out-of-band operation, and
 * v1 defers those entirely because no table is near the ~100,000 rows that make a plain
 * `CREATE INDEX`'s write-block perceptible.
 */
export function concurrentIndexViolation(tag: string, sql: string): Violation | undefined {
  if (!statements(sql).some((statement) => CONCURRENT_INDEX.test(statement))) return undefined;
  return {
    subject: tag,
    message:
      "CREATE INDEX CONCURRENTLY cannot appear in a migration. ADR-0024: drizzle-kit applies " +
      "every pending migration inside one transaction, and Postgres refuses a concurrent index " +
      "inside a transaction block (SQLSTATE 25001). Use a plain CREATE INDEX, or run it " +
      "out of band and record the migration afterwards.",
  };
}

/**
 * A destructive migration needs a marker, and the migration it names must **already be on the base
 * branch** — which is how the gate proves expand and contract are two releases without inspecting
 * a deploy log.
 *
 * `appliedTags` is the journal as it stands on the base branch, so a marker naming a migration
 * added by this same pull request does not satisfy it. Two releases is what this enforces; ADR-0024
 * records that a removal carrying data needs **three**, and says so because the gate cannot see it.
 */
export function destructiveViolations(
  tag: string,
  sql: string,
  appliedTags: readonly string[],
): Violation[] {
  const statements = destructiveStatements(sql);
  if (statements.length === 0) return [];

  const marker = destructiveMarker(sql);
  if (marker === undefined) {
    return [
      {
        subject: tag,
        message:
          `contains ${statements.join(", ")} with no marker. Add ` +
          "`-- destructive: completes <tag>` naming the migration that made this safe, and note " +
          "that migration must already be on the base branch — an expand and its contract cannot " +
          "share a pull request (ADR-0017, ADR-0024).",
      },
    ];
  }

  if (!appliedTags.includes(marker)) {
    return [
      {
        subject: tag,
        message:
          `is marked as completing \`${marker}\`, which is not on the base branch. The expand ` +
          "step has to ship first: under ADR-0005's rolling deploy old and new code share one " +
          "schema, so expand and contract are two releases (ADR-0024).",
      },
    ];
  }

  return [];
}

/**
 * The journal is append-only. Existing entries may not be reordered, retagged or removed.
 *
 * An edited applied migration is the purest source of environment divergence there is: a database
 * rebuilt from zero gets one schema, production keeps another, and nothing ever announces it.
 */
export function journalViolations(
  base: readonly JournalEntry[],
  head: readonly JournalEntry[],
): Violation[] {
  if (head.length < base.length) {
    return [
      {
        subject: "meta/_journal.json",
        message: `lost ${base.length - head.length} entr${
          base.length - head.length === 1 ? "y" : "ies"
        }. Migrations are append-only; a migration that has been applied is never removed.`,
      },
    ];
  }

  return base.flatMap((entry, index) => {
    const current = head[index];
    if (current !== undefined && JSON.stringify(current) === JSON.stringify(entry)) return [];
    return [
      {
        subject: "meta/_journal.json",
        message:
          `entry ${index} (\`${entry.tag}\`) was edited. Migrations are append-only, and the ` +
          "journal is never edited by hand — only appended to by `drizzle-kit generate`.",
      },
    ];
  });
}

/**
 * Git name-status letters, mapped to whether they are allowed on a file already on the base
 * branch. Only `_journal.json` may change, and `journalViolations` then decides how.
 */
export function editedMigrationViolations(
  changes: readonly { status: string; path: string }[],
): Violation[] {
  return changes
    .filter(({ path }) => path.endsWith(".sql") || path.includes("meta/"))
    .filter(({ status, path }) => {
      if (status.startsWith("A")) return false;
      return !(path.endsWith("meta/_journal.json") && status.startsWith("M"));
    })
    .map(({ status, path }) => ({
      subject: path,
      message:
        `was ${verb(status)} rather than added. A migration on the base branch has been applied ` +
        "somewhere — editing it gives a database rebuilt from zero one schema and production " +
        "another, silently (ADR-0017).",
    }));
}

function verb(status: string): string {
  if (status.startsWith("D")) return "deleted";
  if (status.startsWith("R")) return "renamed";
  if (status.startsWith("M")) return "modified";
  return `changed (${status})`;
}
