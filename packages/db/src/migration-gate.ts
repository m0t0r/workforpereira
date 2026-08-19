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
function scrub(sql: string, keepIdentifiers = false): string {
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
      const start = index;
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

      // `keepIdentifiers` preserves `"a_constraint_name"` while still blanking `'a literal'`. Only
      // `redefinedConstraints` asks for it, and only because pairing a drop with its add needs the
      // name. It is never used for *detection*: a column genuinely named `"type"` would make
      // `ALTER COLUMN "type" SET DEFAULT 'open'` read as `ALTER COLUMN … TYPE`, which is the very
      // false positive this function exists to kill.
      if (character === '"' && keepIdentifiers) {
        out += ` ${sql.slice(start, cursor)} `;
        continue;
      }

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
function statements(sql: string, keepIdentifiers = false): string[] {
  return scrub(sql, keepIdentifiers)
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

/** `DROP CONSTRAINT "x"` / `ADD CONSTRAINT "x"` — the name, so the two halves can be paired. */
const CONSTRAINT_NAME = /\b(drop|add)\s+constraint\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i;

/**
 * Constraint names this migration **drops and immediately re-adds**.
 *
 * This is the one shape on the destructive list that is not a removal, and drizzle-kit produces it
 * routinely: widening a `text({ enum })` column's `CHECK` list — adding a notification template,
 * a Purpose, an Offer status — emits a `DROP CONSTRAINT` and an `ADD CONSTRAINT` of the same name
 * in the same file, because Postgres has no `ALTER CONSTRAINT` for a check predicate.
 *
 * Nothing is removed across that pair. ADR-0024 applies the whole migration in **one transaction**,
 * so there is no instant at which the table is unconstrained, and a constraint is not a surface old
 * code *uses* the way a column or a table is — it is something old code is subject to.
 *
 * **What the gate stops being able to see, stated rather than glossed.** A redefinition can still
 * break a rolling deploy if the new predicate is *narrower* than the old one: old code writing a
 * value the new `CHECK` forbids fails inside whatever transaction it was in. Widening is safe and
 * narrowing is a contract step needing two releases — and the difference lives in the predicate,
 * which this gate does not parse and should not pretend to. So this joins the list ADR-0008 keeps
 * of rules that are **review conventions rather than automation**: *widen a constraint freely;
 * narrowing one is a contract step, and the marker is how you say so.*
 *
 * The alternative was leaving the pair on the destructive list, and it is worse than it sounds.
 * Every enum widening would need a marker naming an earlier migration that made it safe — and there
 * is no such migration, because nothing had to happen first. Authors would attach a marker naming
 * whichever migration created the constraint, which is exactly the bogus-marker erosion `scrub()`
 * above was written to avoid.
 */
function redefinedConstraints(sql: string): Set<string> {
  const dropped = new Set<string>();
  const added = new Set<string>();

  for (const statement of statements(sql, true)) {
    const match = CONSTRAINT_NAME.exec(statement);
    const verb = match?.[1];
    const name = match?.[2];
    if (verb === undefined || name === undefined) continue;
    (verb.toLowerCase() === "drop" ? dropped : added).add(name);
  }

  return new Set([...dropped].filter((name) => added.has(name)));
}

/** The destructive statements a migration contains, by label. Empty for an additive migration. */
export function destructiveStatements(sql: string): string[] {
  // Detection runs on the fully scrubbed body; only the drop/add pairing above reads identifiers.
  const body = statements(sql);
  const redefined = redefinedConstraints(sql);
  const withIdentifiers = statements(sql, true);

  return DESTRUCTIVE.filter(({ label, pattern }) =>
    body.some((statement, position) => {
      if (!pattern.test(statement)) return false;
      if (label !== "DROP CONSTRAINT") return true;

      // A `DROP CONSTRAINT` whose name is re-added in this same migration is a redefinition rather
      // than a removal — see `redefinedConstraints`. The name lives in the identifier-preserving
      // pass, at the same position: both passes blank the same comments, literals and dollar-quoted
      // bodies, so they split into the same statements in the same order. If that ever stops being
      // true the exemption is skipped and the migration stays destructive, which is the safe way to
      // be wrong.
      const name = CONSTRAINT_NAME.exec(withIdentifiers[position] ?? "")?.[2];
      return name === undefined || !redefined.has(name);
    }),
  ).map(({ label }) => label);
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
 * The journal's timestamps must strictly increase. This is the one check here that guards against
 * silent data loss rather than against untidiness.
 *
 * `drizzle-orm`'s migrator selects the **single newest** applied row —
 * `order by created_at desc limit 1` — and then applies a pending migration only when
 * `lastDbMigration.created_at < migration.folderMillis`. A migration stamped earlier than one
 * already applied is therefore **skipped without an error**, the run exits 0, and the row is never
 * recorded — so it is skipped again on every future run, because that ceiling only rises. The table
 * simply never exists in production while every gate and the application both believe it shipped.
 * Verified against PGlite, not inferred.
 *
 * **This is what parallel branches produce.** `drizzle-kit generate` stamps `when` with
 * `Date.now()` at the moment it runs, so two sessions working at the same time stamp in the order
 * they *generated*, and merge in the order they were *approved*. Whichever merges second is stamped
 * first, and disappears. Neither `drizzle-kit check` nor the append-only rule above notices: the
 * journal was only appended to, and every snapshot is internally consistent.
 *
 * The fix when this fires is cheap, which is why the rule can afford to be absolute: rebase on the
 * base branch, delete the migration, and run `pnpm db:generate` again so it is stamped last.
 * Migrations are append-only and nothing has been applied anywhere yet, so regenerating costs a
 * command.
 *
 * A tie fails for the same reason an inversion does — the comparison in the migrator is strict.
 */
export function journalOrderViolations(entries: readonly JournalEntry[]): Violation[] {
  return entries.flatMap((entry, index) => {
    const previous = entries[index - 1];
    if (previous === undefined || previous.when < entry.when) return [];
    return [
      {
        subject: entry.tag,
        message:
          `is stamped ${entry.when}, which is not after \`${previous.tag}\` at ${previous.when} — ` +
          "so once that one has been applied this migration is **silently skipped**, on this run " +
          "and every run after it. drizzle-orm applies a migration only when its timestamp is " +
          "greater than the newest already applied, and reports no error when it is not. Two " +
          "branches generating at once is how this happens: rebase on the base branch, delete " +
          "this migration and run `pnpm db:generate` again so it is stamped last.",
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
