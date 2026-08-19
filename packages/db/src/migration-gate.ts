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

/**
 * Any `CONCURRENTLY`, not only `CREATE INDEX CONCURRENTLY`.
 *
 * `DROP INDEX CONCURRENTLY`, `REINDEX … CONCURRENTLY` and
 * `REFRESH MATERIALIZED VIEW CONCURRENTLY` are all refused inside a transaction block with the
 * same SQLSTATE 25001, and every one of them would pass a check written for `CREATE` alone and
 * then fail the production deploy — the exact failure this exists to catch. The word appears only
 * as a keyword once literals and identifiers are scrubbed, so matching it bare is precise enough.
 */
const CONCURRENTLY = /\bconcurrently\b/i;

const MARKER = /^\s*--\s*destructive:\s*completes\s+(\S+)\s*$/im;

/**
 * SQL with everything that is **not a keyword** blanked out: comments, string literals, quoted
 * identifiers and dollar-quoted bodies.
 *
 * Every pattern above is a bare word, so without this they match text that only looks like SQL,
 * and both cases are real. `ALTER COLUMN "type" SET DEFAULT 'open'` is purely additive and reads
 * as `ALTER COLUMN … TYPE`, because `type` is the column's *name*. `INSERT INTO documents (body)
 * VALUES ('we will rename it later')` reads as a `RENAME`. A gate that hard-fails an additive
 * migration teaches authors to attach a bogus `-- destructive: completes …` marker, which is the
 * erosion the marker exists to prevent.
 *
 * Dollar-quoted bodies are scrubbed first and whole, because a `DO $$ … $$` block written by hand
 * (`drizzle-kit generate --custom`) carries its own semicolons and would otherwise be split into
 * fragments.
 */
function scrub(sql: string): string {
  let out = "";
  let index = 0;

  while (index < sql.length) {
    const rest = sql.slice(index);

    const dollar = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(rest);
    if (dollar !== null) {
      const tag = dollar[0];
      const end = sql.indexOf(tag, index + tag.length);
      index = end === -1 ? sql.length : end + tag.length;
      out += " ";
      continue;
    }

    if (rest.startsWith("--")) {
      const newline = sql.indexOf("\n", index);
      index = newline === -1 ? sql.length : newline;
      out += " ";
      continue;
    }

    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", index + 2);
      index = end === -1 ? sql.length : end + 2;
      out += " ";
      continue;
    }

    const character = sql[index];
    if (character === "'" || character === '"') {
      // A doubled quote is the SQL escape, so `''` inside a literal is not its end.
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === character) {
          if (sql[cursor + 1] === character) {
            cursor += 2;
            continue;
          }
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      index = cursor;
      out += character === '"' ? ' "" ' : " '' ";
      continue;
    }

    out += character;
    index += 1;
  }

  return out;
}

/**
 * The migration's statements, scrubbed and split on `;`.
 *
 * Matching per statement rather than over the whole file is not tidiness. `ALTER COLUMN … TYPE`
 * needs both words in one statement; run against the file as a whole, an additive migration that
 * happens to contain an `ALTER COLUMN … SET NOT NULL` above and a `type` anywhere below it would
 * be reported as a type change that is not there.
 */
function statements(sql: string): string[] {
  return scrub(sql)
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
 * `CONCURRENTLY` can never appear in a migration, marker or not.
 *
 * `drizzle-kit migrate` applies every pending migration inside **one** transaction (ADR-0024), and
 * Postgres refuses a concurrent index inside a transaction block with SQLSTATE 25001 — so this
 * does not fail review, it fails the deploy. A concurrent index is an out-of-band operation, and
 * v1 defers those entirely because no table is near the ~100,000 rows that make a plain
 * `CREATE INDEX`'s write-block perceptible.
 */
export function concurrentStatementViolations(tag: string, sql: string): Violation[] {
  if (!statements(sql).some((statement) => CONCURRENTLY.test(statement))) return [];
  return [
    {
      subject: tag,
      message:
        "uses CONCURRENTLY, which cannot appear in a migration. ADR-0024: drizzle-kit applies " +
        "every pending migration inside one transaction, and Postgres refuses CREATE INDEX, " +
        "DROP INDEX and REINDEX CONCURRENTLY inside a transaction block (SQLSTATE 25001). Use " +
        "the plain form, or run it out of band and record the migration afterwards.",
    },
  ];
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
  const found = destructiveStatements(sql);
  if (found.length === 0) return [];

  const marker = destructiveMarker(sql);
  if (marker === undefined) {
    return [
      {
        subject: tag,
        message:
          `contains ${found.join(", ")} with no marker. Add ` +
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
    if (current !== undefined && sameEntry(entry, current)) return [];
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

/**
 * Field by field rather than `JSON.stringify`, which is key-order sensitive: a `_journal.json`
 * rewritten by a future drizzle-kit with the same values in a different order is not an edit, and
 * failing the gate on one would teach people to distrust it.
 */
function sameEntry(left: JournalEntry, right: JournalEntry): boolean {
  return (
    left.idx === right.idx &&
    left.version === right.version &&
    left.when === right.when &&
    left.tag === right.tag &&
    left.breakpoints === right.breakpoints
  );
}

function verb(status: string): string {
  if (status.startsWith("D")) return "deleted";
  if (status.startsWith("R")) return "renamed";
  if (status.startsWith("M")) return "modified";
  return `changed (${status})`;
}
