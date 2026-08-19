import {
  concurrentStatementViolations,
  journalOrderViolations,
  destructiveMarker,
  destructiveStatements,
  destructiveViolations,
  editedMigrationViolations,
  journalViolations,
  type JournalEntry,
} from "./migration-gate";

const entry = (idx: number, tag: string): JournalEntry => ({
  idx,
  version: "7",
  when: 1_786_909_481_151 + idx,
  tag,
  breakpoints: true,
});

describe("destructive statements", () => {
  it.each([
    ['DROP TABLE "offers";', "DROP TABLE"],
    ['ALTER TABLE "offers" DROP COLUMN "note";', "DROP COLUMN"],
    ['ALTER TABLE "offers" ALTER COLUMN "note" SET NOT NULL;', "ALTER COLUMN … SET NOT NULL"],
    ['ALTER TABLE "offers" ALTER COLUMN "note" SET DATA TYPE text;', "ALTER COLUMN … TYPE"],
    ['ALTER TABLE "offers" DROP CONSTRAINT "offers_person_id_fk";', "DROP CONSTRAINT"],
    ['ALTER TABLE "offers" RENAME COLUMN "note" TO "message";', "RENAME"],
  ])("names %s", (sql, label) => {
    expect(destructiveStatements(sql)).toContain(label);
  });

  it("says nothing about an additive migration", () => {
    expect(destructiveStatements('ALTER TABLE "offers" ADD COLUMN "note" text;')).toEqual([]);
  });

  /**
   * The reason statements are matched one at a time. Both words appear in the file; neither
   * statement is a type change.
   */
  it("does not read a SET NOT NULL and a later mention of a type as one type change", () => {
    const sql = [
      'ALTER TABLE "offers" ALTER COLUMN "note" SET NOT NULL;',
      'CREATE TABLE "kinds" ("type" text NOT NULL);',
    ].join("\n");
    expect(destructiveStatements(sql)).toEqual(["ALTER COLUMN … SET NOT NULL"]);
  });

  it("does not read a column named `type` as a type change", () => {
    expect(
      destructiveStatements(`ALTER TABLE "offers" ALTER COLUMN "type" SET DEFAULT 'open';`),
    ).toEqual([]);
  });

  it("does not read a word inside a string literal as a statement", () => {
    expect(
      destructiveStatements("INSERT INTO documents (body) VALUES ('we will rename it later');"),
    ).toEqual([]);
  });

  it("does not split a dollar-quoted body on its own semicolons", () => {
    const sql = "DO $$ BEGIN PERFORM 1; PERFORM 2; END $$;";
    expect(destructiveStatements(sql)).toEqual([]);
  });

  it("still sees a real drop beside a literal that mentions one", () => {
    const sql = [
      "INSERT INTO documents (body) VALUES ('nothing is dropped here');",
      'ALTER TABLE "offers" DROP COLUMN "note";',
    ].join("\n");
    expect(destructiveStatements(sql)).toEqual(["DROP COLUMN"]);
  });

  it("never reads its own marker as a statement", () => {
    expect(
      destructiveStatements("-- destructive: completes 0014_rename_type_drop_column\n"),
    ).toEqual([]);
  });
});

describe("the destructive marker", () => {
  it("reads the migration it names", () => {
    expect(destructiveMarker("-- destructive: completes 0014_add_nullable_x\nDROP TABLE x;")).toBe(
      "0014_add_nullable_x",
    );
  });

  it("is absent when nothing declares one", () => {
    expect(destructiveMarker("DROP TABLE x;")).toBeUndefined();
  });
});

describe("a destructive migration", () => {
  const drop = 'ALTER TABLE "offers" DROP COLUMN "note";';

  it("fails with no marker", () => {
    const [violation] = destructiveViolations("0015_drop_note", drop, ["0014_add_message"]);
    expect(violation?.message).toContain("no marker");
  });

  it("fails when the marker names a migration not yet on the base branch", () => {
    const sql = `-- destructive: completes 0014_add_message\n${drop}`;
    const [violation] = destructiveViolations("0015_drop_note", sql, ["0000_enable_extensions"]);
    expect(violation?.message).toContain("not on the base branch");
  });

  it("passes when the marker names a migration already on the base branch", () => {
    const sql = `-- destructive: completes 0014_add_message\n${drop}`;
    expect(destructiveViolations("0015_drop_note", sql, ["0014_add_message"])).toEqual([]);
  });

  it("needs no marker when it is additive", () => {
    expect(
      destructiveViolations("0015_add_note", 'ALTER TABLE "offers" ADD COLUMN "note" text;', []),
    ).toEqual([]);
  });
});

describe("CONCURRENTLY", () => {
  it("is refused, and the message names ADR-0024", () => {
    const [violation] = concurrentStatementViolations(
      "0015_index",
      'CREATE INDEX CONCURRENTLY "offers_person_id_idx" ON "offers" ("person_id");',
    );
    expect(violation?.message).toContain("ADR-0024");
  });

  it("is refused for a unique index too", () => {
    expect(
      concurrentStatementViolations("0015_index", "CREATE UNIQUE INDEX CONCURRENTLY x ON y (z);"),
    ).toHaveLength(1);
  });

  /** No marker rescues it: it is not a policy about releases, it is a statement that cannot run. */
  it("is refused even with a destructive marker", () => {
    const sql =
      "-- destructive: completes 0014_add_nullable_x\nCREATE INDEX CONCURRENTLY x ON y (z);";
    expect(concurrentStatementViolations("0015_index", sql)).toHaveLength(1);
  });

  it.each([
    "DROP INDEX CONCURRENTLY x;",
    "REINDEX INDEX CONCURRENTLY x;",
    "REFRESH MATERIALIZED VIEW CONCURRENTLY x;",
  ])("is refused for %s, which Postgres also forbids in a transaction block", (sql) => {
    expect(concurrentStatementViolations("0015_index", sql)).toHaveLength(1);
  });

  it("says nothing about a plain index", () => {
    expect(
      concurrentStatementViolations(
        "0015_index",
        'CREATE INDEX "offers_idx" ON "offers" ("person_id");',
      ),
    ).toEqual([]);
  });
});

describe("the journal", () => {
  const base = [entry(0, "0000_enable_extensions"), entry(1, "0001_persons")];

  it("accepts an appended entry", () => {
    expect(journalViolations(base, [...base, entry(2, "0002_offers")])).toEqual([]);
  });

  it("refuses a retagged entry", () => {
    const head = [entry(0, "0000_enable_extensions"), entry(1, "0001_people")];
    expect(journalViolations(base, head)[0]?.message).toContain("was edited");
  });

  it("refuses a hand-edited timestamp", () => {
    const edited: JournalEntry = { ...entry(1, "0001_persons"), when: 1 };
    expect(
      journalViolations(base, [entry(0, "0000_enable_extensions"), edited])[0]?.message,
    ).toContain("was edited");
  });

  it("refuses a removed entry", () => {
    expect(journalViolations(base, [entry(0, "0000_enable_extensions")])[0]?.message).toContain(
      "lost 1 entry",
    );
  });
});

/**
 * The one that is not about tidiness. `drizzle-orm`'s migrator selects the single newest applied
 * row and then applies a pending migration only when `lastDbMigration.created_at < folderMillis`,
 * so a migration stamped earlier than one already applied is skipped in silence — and stays
 * skipped, because that ceiling only rises.
 */
describe("journal order", () => {
  it("accepts stamps that increase", () => {
    expect(journalOrderViolations([entry(0, "a"), entry(1, "b")])).toEqual([]);
  });

  it("refuses a migration stamped before the one ahead of it — the parallel-branch case", () => {
    const late = { ...entry(0, "0001_session_a"), when: 3000 };
    const early = { ...entry(1, "0002_session_b"), when: 2000 };
    const [violation] = journalOrderViolations([late, early]);
    expect(violation?.message).toContain("silently skipped");
    expect(violation?.message).toContain("0001_session_a");
  });

  /** `<` is strict in the migrator, so a tie is skipped exactly like an inversion. */
  it("refuses two migrations stamped in the same millisecond", () => {
    const first = { ...entry(0, "0001_a"), when: 3000 };
    const second = { ...entry(1, "0002_b"), when: 3000 };
    expect(journalOrderViolations([first, second])).toHaveLength(1);
  });

  it("says nothing about a single migration", () => {
    expect(journalOrderViolations([entry(0, "0000_base")])).toEqual([]);
  });
});

describe("a migration already on the base branch", () => {
  it("may not be modified", () => {
    const violations = editedMigrationViolations([
      { status: "M", path: "migrations/0000_enable_extensions.sql" },
    ]);
    expect(violations[0]?.message).toContain("modified");
  });

  it("may not be deleted or renamed", () => {
    expect(
      editedMigrationViolations([
        { status: "D", path: "migrations/0000_enable_extensions.sql" },
        { status: "R100", path: "migrations/0001_persons.sql" },
      ]),
    ).toHaveLength(2);
  });

  it("may be added", () => {
    expect(
      editedMigrationViolations([{ status: "A", path: "migrations/0002_offers.sql" }]),
    ).toEqual([]);
  });

  it("lets the journal be modified, because appending to it is a modification", () => {
    expect(
      editedMigrationViolations([{ status: "M", path: "migrations/meta/_journal.json" }]),
    ).toEqual([]);
  });

  it("refuses an edited snapshot, which is drizzle-kit's record of what it emitted", () => {
    expect(
      editedMigrationViolations([{ status: "M", path: "migrations/meta/0000_snapshot.json" }]),
    ).toHaveLength(1);
  });
});
