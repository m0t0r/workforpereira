import { consents, documentVersions, persons } from "@repo/db/schema";
import { withRollback } from "@repo/db/testing";
import { and, eq } from "drizzle-orm";

import {
  consentHistory,
  DisclosureNotSeededError,
  DuplicateConsentDecisionError,
  hasConsented,
  MissingConsentDecisionError,
  PersonNotFoundError,
  recordSignupConsents,
  RequiredConsentRefusedError,
  UnexpectedConsentDecisionError,
} from "./consents";
import {
  allSignupBoxesTicked,
  insertPerson,
  seedFixtureDocuments,
  TEST_SUBJECT_KEY_SECRET,
} from "./fixtures";
import { SIGNUP_PURPOSES } from "./purposes";
import { seedDocumentVersions } from "./seed";
import { subjectKey } from "./subject-key";

const EMAIL = "yeimy@example.test";

describe("recording the signup consents", () => {
  // The acceptance criterion: "a `consents` row exists per purpose, each pointing at a frozen
  // `document_versions` row".
  it(
    "writes one row per Purpose asked",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      const recorded = await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      expect(recorded).toHaveLength(3);
      expect([...recorded.map((c) => c.purpose)].sort()).toEqual(
        ["account", "safety", "transactional_messages"].sort(),
      );
    }),
  );

  it(
    "points every row at the frozen disclosure",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      const rows = await tx
        .select({ kind: documentVersions.kind, slug: documentVersions.slug })
        .from(consents)
        .innerJoin(documentVersions, eq(documentVersions.id, consents.documentVersionId));

      expect(rows).toHaveLength(SIGNUP_PURPOSES.length);
      // ADR-0007: the single foreign key points at a `disclosure`, and that row pins the other two.
      for (const row of rows) {
        expect(row.kind).toBe("disclosure");
        expect(row.slug).toBe("disclosure-signup");
      }
    }),
  );

  it(
    "anchors every row on the subject key so the proof outlives the Titular",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      const rows = await tx.select({ subjectKey: consents.subjectKey }).from(consents);
      const expected = subjectKey(TEST_SUBJECT_KEY_SECRET, EMAIL);

      expect(rows.every((row) => row.subjectKey === expected)).toBe(true);
    }),
  );

  it(
    "does not hand the subject key back on the public type",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      const [recorded] = await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      expect(recorded).not.toHaveProperty("subjectKey");
      expect(recorded).not.toHaveProperty("personId");
      expect(recorded).not.toHaveProperty("id");
    }),
  );

  it(
    "leaves the scoped-subject columns null for an account-wide consent",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      const recorded = await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      for (const consent of recorded) {
        expect(consent.subjectKind).toBeNull();
        expect(consent.subjectPublicId).toBeNull();
      }
    }),
  );
});

describe("refusing to record an incoherent set of decisions", () => {
  const withPerson = async (tx: Parameters<Parameters<typeof withRollback>[0]>[0]) => {
    await seedFixtureDocuments(tx);
    const person = await insertPerson(tx);
    return (decisions: Parameters<typeof recordSignupConsents>[1]["decisions"]) =>
      recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions,
      });
  };

  // Refusing a required Purpose means there is no account: nothing lawful remains to do, because
  // Colombia has no legitimate-interest basis (ADR-0007).
  it(
    "refuses when safety is not granted",
    withRollback(async (tx) => {
      const record = await withPerson(tx);
      const decisions = allSignupBoxesTicked().map((d) =>
        d.purpose === "safety" ? { ...d, isGranted: false } : d,
      );

      await expect(record(decisions)).rejects.toThrow(RequiredConsentRefusedError);
    }),
  );

  it(
    "writes nothing when it refuses",
    withRollback(async (tx) => {
      const record = await withPerson(tx);
      const decisions = allSignupBoxesTicked().map((d) =>
        d.purpose === "account" ? { ...d, isGranted: false } : d,
      );

      await expect(record(decisions)).rejects.toThrow(RequiredConsentRefusedError);
      expect(await tx.select().from(consents)).toHaveLength(0);
    }),
  );

  // Silence is not consent (D.1377 art. 7), so a missing box is an error rather than a refusal we
  // infer on the person's behalf.
  //
  // **This carries more weight since `news` left the vocabulary.** Every signup Purpose is required
  // now, so no refused row is ever written from this surface and "the box was rendered, unticked and
  // separately selectable" can no longer be shown by a stored refusal. What shows it is this: the
  // caller must submit a decision for every Purpose or be refused outright. Every box, not one
  // representative — a check written against a single Purpose would pass while the others were
  // silently inferred.
  it(
    "refuses a set with any box missing",
    withRollback(async (tx) => {
      const record = await withPerson(tx);

      for (const omitted of SIGNUP_PURPOSES) {
        const decisions = allSignupBoxesTicked().filter((d) => d.purpose !== omitted);
        await expect(record(decisions)).rejects.toThrow(MissingConsentDecisionError);
      }
    }),
  );

  it(
    "refuses a Purpose that is consented in context rather than at signup",
    withRollback(async (tx) => {
      const record = await withPerson(tx);
      const decisions = [...allSignupBoxesTicked(), { purpose: "photo" as const, isGranted: true }];

      // `photo` is never requirable and is consented at upload with its own explicit disclosure.
      await expect(record(decisions)).rejects.toThrow(UnexpectedConsentDecisionError);
    }),
  );

  it(
    "refuses a Purpose decided twice",
    withRollback(async (tx) => {
      const record = await withPerson(tx);
      const decisions = [
        ...allSignupBoxesTicked(),
        { purpose: "safety" as const, isGranted: true },
      ];

      // Names the Purpose that was actually duplicated, and only that one. Asserted because the
      // first attempt at this used `!seen.add(x)` — `Set.add` returns the Set, so the list came out
      // empty and the error named nothing at all.
      //
      // On the field rather than the message: the field is the contract (ADR-0001, amended), and a
      // test that matched the sentence would go red the day the sentence was reworded.
      await expect(record(decisions)).rejects.toThrow(DuplicateConsentDecisionError);
      await expect(record(decisions)).rejects.toMatchObject({ duplicated: ["safety"] });
    }),
  );
});

describe("refusing to record against nothing", () => {
  it(
    "refuses when the Person does not exist",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);

      await expect(
        recordSignupConsents(tx, {
          personPublicId: "00000000-0000-7000-8000-000000000000",
          email: EMAIL,
          subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
          decisions: allSignupBoxesTicked(),
        }),
      ).rejects.toThrow(PersonNotFoundError);
    }),
  );

  // Consent cannot be recorded against a document nobody was shown. Without the seed there is no
  // art. 12 artefact, and a `consents` row pointing at nothing is not evidence.
  it(
    "refuses when the disclosure has not been seeded",
    withRollback(async (tx) => {
      const person = await insertPerson(tx);

      await expect(
        recordSignupConsents(tx, {
          personPublicId: person.publicId,
          email: EMAIL,
          subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
          decisions: allSignupBoxesTicked(),
        }),
      ).rejects.toThrow(DisclosureNotSeededError);
    }),
  );
});

describe("asking whether a Person is consented", () => {
  it(
    "says yes for a granted Purpose",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);
      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      expect(await hasConsented(tx, person.publicId, "safety")).toBe(true);
    }),
  );

  // A refused row can no longer arrive from `/signup` — every signup Purpose is required, so a
  // refusal there throws before the insert. The refused rows that exist are revocations, which is
  // what this reads.
  it(
    "says no for a refused Purpose",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);
      await appendConsent(tx, person.publicId, {
        purpose: "safety",
        isGranted: false,
        grantedAt: new Date("2026-12-01T10:00:00Z"),
        disclosureSlug: "disclosure-signup",
        disclosureVersion: "2026-08-19",
      });

      expect(await hasConsented(tx, person.publicId, "safety")).toBe(false);
    }),
  );

  it(
    "says no for a Purpose never asked",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);
      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      expect(await hasConsented(tx, person.publicId, "publish")).toBe(false);
    }),
  );

  // Consent is append-only: a revocation is a newer row refusing the Purpose, never an edit. A
  // reader that takes any row but the newest gets the opposite answer.
  it(
    "takes the latest decision, not the first",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);
      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });
      expect(await hasConsented(tx, person.publicId, "safety")).toBe(true);

      // Written directly rather than through a module function, because revocation is #27's surface
      // and does not exist yet. What is being asserted is the *read*, and the read is what this
      // ticket ships.
      await appendConsent(tx, person.publicId, {
        purpose: "safety",
        isGranted: false,
        grantedAt: new Date("2026-12-01T10:00:00Z"),
        disclosureSlug: "disclosure-signup",
        disclosureVersion: "2026-08-19",
      });

      expect(await hasConsented(tx, person.publicId, "safety")).toBe(false);
    }),
  );

  // ADR-0007's re-consent, and the half that is easiest to leave out. A grant is real, current and
  // against a Disclosure that no longer describes what we do — so it is *not* consent, and the
  // feature stops until the Person is asked again.
  it(
    "fails closed on a grant older than the Purpose's required disclosure version",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      // A Disclosure from before `minimumDisclosureVersion`, seeded alongside the current one.
      await seedDocumentVersions(tx, [
        {
          slug: "disclosure-signup",
          kind: "disclosure",
          version: "2025-01-01",
          effectiveFrom: "2025-01-01T00:00:00.000Z",
          surface: "signup",
          pins: {
            processingPolicy: { slug: "processing-policy", version: "2026-08-19" },
            privacyNotice: { slug: "privacy-notice", version: "2026-08-19" },
          },
          body: "# una versión anterior\n",
        },
      ]);

      await appendConsent(tx, person.publicId, {
        purpose: "safety",
        isGranted: true,
        grantedAt: new Date("2025-02-01T10:00:00Z"),
        disclosureSlug: "disclosure-signup",
        disclosureVersion: "2025-01-01",
      });

      expect(await hasConsented(tx, person.publicId, "safety")).toBe(false);
    }),
  );

  it(
    "counts a grant against a newer disclosure than the minimum",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);

      await seedDocumentVersions(tx, [
        {
          slug: "disclosure-signup",
          kind: "disclosure",
          version: "2027-03-01",
          effectiveFrom: "2027-03-01T00:00:00.000Z",
          surface: "signup",
          pins: {
            processingPolicy: { slug: "processing-policy", version: "2026-08-19" },
            privacyNotice: { slug: "privacy-notice", version: "2026-08-19" },
          },
          body: "# una versión posterior\n",
        },
      ]);

      await appendConsent(tx, person.publicId, {
        purpose: "safety",
        isGranted: true,
        grantedAt: new Date("2027-03-02T10:00:00Z"),
        disclosureSlug: "disclosure-signup",
        disclosureVersion: "2027-03-01",
      });

      expect(await hasConsented(tx, person.publicId, "safety")).toBe(true);
    }),
  );
});

/**
 * Append one `consents` row directly, resolving the internal keys the module deliberately hides.
 *
 * This is a **fixture, not an API**: revocation and re-consent are #27's surface and `@repo/consent`
 * exposes no way to write a row outside a signup yet. What these tests assert is the *read* —
 * "latest wins" and "re-consent fails closed" — and the read is what this ticket ships.
 */
async function appendConsent(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  personPublicId: string,
  row: {
    purpose: Parameters<typeof hasConsented>[2];
    isGranted: boolean;
    grantedAt: Date;
    disclosureSlug: string;
    disclosureVersion: string;
  },
): Promise<void> {
  const [person] = await tx
    .select({ id: persons.id })
    .from(persons)
    .where(eq(persons.publicId, personPublicId))
    .limit(1);
  if (!person) throw new Error(`fixture: no Person ${personPublicId}`);

  const [version] = await tx
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.slug, row.disclosureSlug),
        eq(documentVersions.version, row.disclosureVersion),
      ),
    )
    .limit(1);
  if (!version)
    throw new Error(`fixture: no document ${row.disclosureSlug}@${row.disclosureVersion}`);

  await tx.insert(consents).values({
    personId: person.id,
    subjectKey: subjectKey(TEST_SUBJECT_KEY_SECRET, EMAIL),
    purpose: row.purpose,
    isGranted: row.isGranted,
    grantedAt: row.grantedAt,
    documentVersionId: version.id,
  });
}

describe("the consent history", () => {
  it(
    "returns every decision, newest first",
    withRollback(async (tx) => {
      await seedFixtureDocuments(tx);
      const person = await insertPerson(tx);
      await recordSignupConsents(tx, {
        personPublicId: person.publicId,
        email: EMAIL,
        subjectKeySecret: TEST_SUBJECT_KEY_SECRET,
        decisions: allSignupBoxesTicked(),
      });

      const history = await consentHistory(tx, person.publicId);

      expect(history).toHaveLength(3);
      expect([...history.map((c) => c.purpose)].sort()).toEqual(
        ["account", "safety", "transactional_messages"].sort(),
      );
    }),
  );
});
