/**
 * **Invariant Test — ADR-0008 and ADR-0003.** Better Auth's four tables are *ours* in name and
 * timezone, and *theirs* in everything else.
 *
 * ADR-0003 refuses to own the columns of `users`, `sessions`, `accounts` and `verifications` through
 * every Better Auth upgrade — the audit found that area undocumented, and hand-writing them buys
 * cohesion in the DDL at the cost of owning a vendored subsystem's schema forever. So the file is
 * generated, and `auth generate` overwrites it **whole**, never merging.
 *
 * That is exactly what makes these two properties fragile. Both are applied by
 * `pnpm --filter @repo/auth generate-schema`, and both would be silently reverted by anyone who ran
 * the bare `auth generate` — with no diff for a reviewer to notice, because the file is generated
 * and nobody reads generated files.
 *
 * 1. **The tables are plural** (ADR-0008), configured through `schema.<model>.modelName`. A mixed
 *    database is worse than either convention, and the rename also dodges `user` being a reserved
 *    word in Postgres.
 * 2. **Every instant is `timestamptz`** (ADR-0008). Better Auth's Drizzle generator hardcodes a bare
 *    `timestamp('name')` per dialect and offers no option — `scripts/normalise-generated-schema.ts`
 *    rewrites it, and this is what fails if that step is ever skipped.
 *
 * Never weakened without amending ADR-0008.
 */

import { accounts, sessions, users, verifications } from "@repo/db/schema";
import { getTableColumns, getTableName } from "drizzle-orm";

import { MODEL_NAMES } from "./models";

const TABLES = { users, sessions, accounts, verifications };

describe("Better Auth's tables are remapped to plural", () => {
  it("configures the rename through modelName rather than hand-written DDL", () => {
    // The **model** names stay singular — that is what Better Auth's own documentation and error
    // messages say. Only the physical table is renamed, and only by configuration, which is how
    // ADR-0003's refusal to own their schema survives.
    expect(MODEL_NAMES).toEqual({
      user: { modelName: "users" },
      session: { modelName: "sessions" },
      account: { modelName: "accounts" },
      verification: { modelName: "verifications" },
    });
  });

  it("produces the plural names in the generated schema", () => {
    expect(getTableName(users)).toBe("users");
    expect(getTableName(sessions)).toBe("sessions");
    expect(getTableName(accounts)).toBe("accounts");
    expect(getTableName(verifications)).toBe("verifications");
  });

  it("declares no additional fields, keeping the domain on persons", () => {
    // ADR-0002 keeps the domain and Better Auth apart at exactly one column, `persons.user_id`. A
    // profile field added through `additionalFields` would be a second place, owned by a generator
    // that overwrites its whole output file.
    expect(Object.values(MODEL_NAMES).every((model) => Object.keys(model).length === 1)).toBe(true);
  });
});

describe("every instant in the generated schema is timestamptz", () => {
  it.each(Object.entries(TABLES))("%s", (_name, table) => {
    const timestamps = Object.entries(getTableColumns(table)).filter(
      ([, column]) => column.dataType === "date",
    );

    // Every one of these four tables has at least `created_at`; a table with none would mean the
    // generator's output shape changed and this assertion had quietly stopped checking anything.
    expect(timestamps.length).toBeGreaterThan(0);

    for (const [columnName, column] of timestamps) {
      // `timestamp without time zone` is what Better Auth's generator emits and what ADR-0008
      // forbids: the database session timezone is never to be relied upon, and `sessions.expires_at`
      // is compared to `now()` on every authenticated request.
      expect(`${columnName}: ${column.getSQLType()}`).toBe(
        `${columnName}: timestamp with time zone`,
      );
    }
  });
});
