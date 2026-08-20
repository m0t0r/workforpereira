import { withRollback } from "@repo/db/testing";
import { persons, users } from "@repo/db/schema";
import { eq } from "drizzle-orm";

import {
  createPerson,
  linkToUser,
  personByPublicId,
  personByUserId,
  UnderageError,
} from "./persons";

const MIDDAY = new Date("2026-08-19T20:00:00Z");

/**
 * A Better Auth `users` row, written directly.
 *
 * Fixtures are duplicated per package on purpose (ADR-0017): a shared fixtures package would make
 * the harness depend on the modules whose tests depend on the harness, inverting ADR-0006's DAG.
 *
 * `updatedAt` is supplied explicitly because the generated schema marks it `NOT NULL` with **no
 * database default** — Better Auth always sends it on insert, so the omission only ever bites a
 * hand-written insert like this one.
 */
async function insertUser(tx: Parameters<Parameters<typeof withRollback>[0]>[0], email: string) {
  const id = `user_${email}`;
  await tx.insert(users).values({ id, name: "Nombre Apellido", email, updatedAt: new Date() });
  return id;
}

describe("creating a Person", () => {
  it(
    "writes the row with no authentication account attached",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Yeimy Osorio",
        dateOfBirth: "1991-04-02",
      });

      // ADR-0007's ordering, observable: the Person exists and the seam is still open.
      expect(person.userId).toBeNull();
      expect(person.fullName).toBe("Yeimy Osorio");
      // ADR-0003's public identifier is minted in application code, so it is present immediately.
      expect(person.publicId).toMatch(/^[0-9a-f-]{36}$/);
    }),
  );

  it(
    "does not hand the date of birth back",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Héctor Vélez",
        dateOfBirth: "1980-01-01",
      });
      expect(person).not.toHaveProperty("dateOfBirth");
    }),
  );

  it(
    "does not hand the internal key back",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Héctor Vélez",
        dateOfBirth: "1980-01-01",
      });
      expect(person).not.toHaveProperty("id");
    }),
  );

  it(
    "trims the authored name",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "  Wilmar Restrepo  ",
        dateOfBirth: "1988-11-30",
      });
      expect(person.fullName).toBe("Wilmar Restrepo");
    }),
  );

  it(
    "refuses a name that is only whitespace",
    withRollback(async (tx) => {
      // The `CHECK` on the column is what refuses this, after the trim above turns it into "".
      await expect(
        createPerson(tx, { fullName: "   ", dateOfBirth: "1988-11-30" }),
      ).rejects.toThrow();
    }),
  );

  // Ley 1581 art. 7. Enforced here as well as in the use case, because a `persons` row is the thing
  // the article forbids for a minor and the rule should not depend on the caller.
  it(
    "refuses someone under eighteen",
    withRollback(async (tx) => {
      await expect(
        createPerson(tx, { fullName: "Menor de Edad", dateOfBirth: "2012-01-01" }, MIDDAY),
      ).rejects.toThrow(UnderageError);
    }),
  );

  it(
    "writes nothing when it refuses",
    withRollback(async (tx) => {
      await expect(
        createPerson(tx, { fullName: "Menor de Edad", dateOfBirth: "2012-01-01" }, MIDDAY),
      ).rejects.toThrow(UnderageError);

      const rows = await tx.select().from(persons);
      expect(rows).toHaveLength(0);
    }),
  );

  it(
    "admits someone on their eighteenth birthday",
    withRollback(async (tx) => {
      const person = await createPerson(
        tx,
        { fullName: "Justo Dieciocho", dateOfBirth: "2008-08-19" },
        MIDDAY,
      );
      expect(person.fullName).toBe("Justo Dieciocho");
    }),
  );
});

describe("closing the seam", () => {
  it(
    "attaches the authentication account",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Yeimy Osorio",
        dateOfBirth: "1991-04-02",
      });
      const userId = await insertUser(tx, "yeimy@example.test");

      const linked = await linkToUser(tx, person.publicId, userId);

      expect(linked?.userId).toBe(userId);
    }),
  );

  it(
    "reports a Person that is not there rather than throwing",
    withRollback(async (tx) => {
      const userId = await insertUser(tx, "nadie@example.test");
      const missing = await linkToUser(tx, "00000000-0000-7000-8000-000000000000", userId);
      expect(missing).toBeUndefined();
    }),
  );

  // The unique constraint below stops two Persons sharing one account. It does **not** stop one
  // Person being repointed at a different account — that is the same column written twice, and
  // perfectly legal SQL. Only the `isNull` in the `where` clause stops it.
  it(
    "refuses to move a link that is already set",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Yeimy Osorio",
        dateOfBirth: "1991-04-02",
      });
      const first = await insertUser(tx, "yeimy@example.test");
      const second = await insertUser(tx, "alguien-mas@example.test");

      await linkToUser(tx, person.publicId, first);
      const moved = await linkToUser(tx, person.publicId, second);

      // `undefined` rather than a silent overwrite: the caller has to decide, and `signUp` treats
      // it as the bug it would be.
      expect(moved).toBeUndefined();

      const unchanged = await personByPublicId(tx, person.publicId);
      expect(unchanged?.userId).toBe(first);
    }),
  );

  it(
    "refuses to attach one authentication account to two Persons",
    withRollback(async (tx) => {
      const first = await createPerson(tx, { fullName: "Primera", dateOfBirth: "1991-04-02" });
      const second = await createPerson(tx, { fullName: "Segunda", dateOfBirth: "1992-05-03" });
      const userId = await insertUser(tx, "compartido@example.test");

      await linkToUser(tx, first.publicId, userId);

      // `persons.user_id` is unique: a `users` row is one human (ADR-0002).
      await expect(linkToUser(tx, second.publicId, userId)).rejects.toThrow();
    }),
  );

  it(
    "survives the account being deleted, keeping the Person",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Yeimy Osorio",
        dateOfBirth: "1991-04-02",
      });
      const userId = await insertUser(tx, "yeimy@example.test");
      await linkToUser(tx, person.publicId, userId);

      // ADR-0002's whole point: deleting the authentication account is *not* erasing the Titular.
      // `ON DELETE SET NULL` is the only one in the schema, and this is what it buys.
      await tx.delete(users).where(eq(users.id, userId));

      const survivor = await personByPublicId(tx, person.publicId);
      expect(survivor).toBeDefined();
      expect(survivor?.userId).toBeNull();
    }),
  );
});

describe("finding a Person", () => {
  it(
    "finds them by their authentication account",
    withRollback(async (tx) => {
      const person = await createPerson(tx, {
        fullName: "Yeimy Osorio",
        dateOfBirth: "1991-04-02",
      });
      const userId = await insertUser(tx, "yeimy@example.test");
      await linkToUser(tx, person.publicId, userId);

      const found = await personByUserId(tx, userId);
      expect(found?.publicId).toBe(person.publicId);
    }),
  );

  it(
    "finds nobody for an account still inside the signup window",
    withRollback(async (tx) => {
      const userId = await insertUser(tx, "a-medias@example.test");
      expect(await personByUserId(tx, userId)).toBeUndefined();
    }),
  );
});
