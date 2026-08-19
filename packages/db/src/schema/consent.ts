import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { createdAt, id } from "../columns";
import { persons } from "./people";

/**
 * The three documents Ley 1581 and Decreto 1377 make us able to reproduce, as a closed vocabulary
 * (ADR-0007, ADR-0008).
 *
 * | value               | document                                   | source                                         |
 * | ------------------- | ------------------------------------------ | ---------------------------------------------- |
 * | `processing_policy` | _política de tratamiento_                  | D.1377 art. 13 — six mandatory contents        |
 * | `privacy_notice`    | _aviso de privacidad_                      | D.1377 arts. 14–15 — a fallback, four contents |
 * | `disclosure`        | what the Person was told before consenting | L.1581 art. 12                                 |
 *
 * English identifiers with the statute named beside them, per ADR-0001 — and the first two
 * deliberately match their route slugs, so `/legal/processing-policy` and a row name the same
 * artefact.
 */
export const DOCUMENT_KINDS = ["processing_policy", "privacy_notice", "disclosure"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/**
 * Every _finalidad_ a Person may accept or refuse, as a closed vocabulary.
 *
 * **`text({ enum })` plus an explicit `check()`, never `pgEnum`** (ADR-0008, superseding ADR-0007's
 * original `pgEnum`): a plain `text` column in the database, the same union in TypeScript, the same
 * `z.enum` under `drizzle-zod`, and no `ALTER TYPE` the day an eighth _finalidad_ appears.
 *
 * Seven, not eight. `suggestions` left the v1 set with ADR-0016 — nothing sends a Suggestion, so
 * consenting to it would describe a _finalidad_ nobody pursues — and its return costs a new
 * Disclosure version and a re-consent prompt rather than a redesign.
 *
 * **Which of these are required is not here.** That metadata is a frozen record in `@repo/consent`,
 * because ADR-0007 requires bumping a required version to be *a code change reviewable in the same
 * commit as the markdown and the notification*, rather than an `UPDATE` somebody can run against
 * production.
 */
export const PURPOSES = [
  /** Hold an account and a profile. Required. */
  "account",
  /** Messages about the service itself. Required — Ley 2300 art. 5 par. 2 permits this one. */
  "transactional_messages",
  /** Moderation and investigation. Required, because Colombia has no legitimate-interest basis. */
  "safety",
  /** Optional. Ley 2300 art. 5 par. 2 forbids requiring consent to commercial messages. */
  "news",
  /** Consented at the moment of publishing, not at signup. */
  "publish",
  /** Consented per Offer, by each side separately (ADR-0007). */
  "disclose_contact",
  /** **Never requirable** — the one sensitive-data purpose (ADR-0010). Consented at upload. */
  "photo",
] as const;

export type Purpose = (typeof PURPOSES)[number];

/**
 * A `CHECK` list derived from an `as const` rather than retyped under it.
 *
 * `sql.raw` is safe here and only here: every value is a compile-time literal, so there is no input
 * to inject, and a check constraint has to reach drizzle-kit as literal SQL — bound parameters
 * would render as `$1` in the migration. Deriving it means adding a value changes the generated SQL
 * and `pnpm db:check`'s drift rule fails the pull request that forgot to generate the migration.
 */
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

/**
 * A frozen legal document, one row per version. **Append-only** — hence `createdAt()` alone, whose
 * absence of an `updated_at` is ADR-0008's marker for a table nobody updates.
 *
 * Documents are **authored in the repo and frozen in the database**, and ADR-0007 wants both
 * halves: D.1377 art. 16 requires retaining the model of every _aviso_ for as long as obligations
 * derived from it endure, and an export in 2029 must render back the exact text shown in 2026.
 * Markdown in a repo is pleasant to author and useless as evidence; a table is evidence and
 * miserable to author.
 *
 * The bridge is `@repo/consent`'s hash-checked seed, which **fails the deploy** when an authored
 * file no longer matches the version already frozen here — so an edit-in-place is caught at deploy
 * rather than discovered in a dispute.
 */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: id(),

    kind: text({ enum: DOCUMENT_KINDS }).notNull(),

    /**
     * Which document, stable across its versions: `processing-policy`, `privacy-notice`,
     * `disclosure-signup`.
     *
     * The authored file is `docs/legal/<slug>/<version>.md`, so the slug is one path segment.
     * ADR-0007 writes the disclosures `disclosure/signup`; that is this, with the separator that
     * keeps a slug a slug.
     */
    slug: text().notNull(),

    /** The version's own name. Dated — `2026-08-19` — so it sorts and a person can cite it. */
    version: text().notNull(),

    /**
     * When this version takes effect. A **domain timestamp**, never collapsed into `created_at`
     * (ADR-0008): a version is authored, seeded and effective at three different moments, and it is
     * exactly that divergence an audit wants to see.
     *
     * ADR-0007 models the art. 5 notification as a send that must *precede* this instant, so a
     * version cannot go live without its notice having gone out.
     */
    effectiveFrom: timestamp({ withTimezone: true }).notNull(),

    /** The exact text the Person was shown. This column is the evidence. */
    body: text().notNull(),

    /**
     * SHA-256 of `body`, in lowercase hex.
     *
     * Stored rather than recomputed because it is what the seed compares against, and because a
     * mismatch is meant to be an *assertion about a row that already exists* rather than a
     * derivation from the row being checked.
     */
    contentHash: text().notNull(),

    /**
     * A `disclosure` pins the _política_ and the _aviso_ that were in force when it was published,
     * and nothing else does.
     *
     * This is what makes ADR-0007's **one foreign key per `consents` row** work: the whole triple —
     * what we told them, the policy behind it, the notice beside it — is atomic and recoverable
     * from a single reference. Three separate FKs on every consent row would be cheaper and would
     * guarantee nothing about the three having been shown together.
     *
     * Null on a `processing_policy` or `privacy_notice` row, and the check constraint below makes
     * that an invariant rather than a convention.
     */
    processingPolicyVersionId: bigint({ mode: "bigint" }).references(
      (): AnyPgColumn => documentVersions.id,
      { onDelete: "restrict" },
    ),
    privacyNoticeVersionId: bigint({ mode: "bigint" }).references(
      (): AnyPgColumn => documentVersions.id,
      { onDelete: "restrict" },
    ),

    ...createdAt(),
  },
  (t) => [
    unique("document_versions_slug_version_unique").on(t.slug, t.version),

    check("document_versions_kind_check", sql`${t.kind} in (${inList(DOCUMENT_KINDS)})`),

    /**
     * A `disclosure` pins both, everything else pins neither — written as two equivalences so a row
     * pinning only one is refused too.
     *
     * Without this, a disclosure seeded with a null pin would still satisfy every foreign key and
     * would silently fail to reproduce what the Person was shown, which is the one thing this table
     * exists for.
     */
    check(
      "document_versions_pins_check",
      sql`(${t.kind} = 'disclosure') = (${t.processingPolicyVersionId} is not null)
        and (${t.kind} = 'disclosure') = (${t.privacyNoticeVersionId} is not null)`,
    ),

    index("document_versions_processing_policy_version_id_idx").on(t.processingPolicyVersionId),
    index("document_versions_privacy_notice_version_id_idx").on(t.privacyNoticeVersionId),
  ],
);

/**
 * One Person accepting **or refusing** one Purpose at one moment, pointing at the exact document
 * version they were shown.
 *
 * **Append-only. Never updated; a change of mind is a new row** (ADR-0007). Art. 9 of Ley 1581
 * requires authorisation "obtenida por cualquier medio que pueda ser objeto de consulta posterior",
 * art. 17(b) requires us to conserve a copy, and art. 12 parágrafo requires proof of the disclosure
 * that preceded it. A boolean column on `persons` satisfies none of it.
 *
 * A refusal is stored as deliberately as a grant. It is the evidence that the box was **unticked
 * and separately selectable**, which is what D.1377 art. 7's ban on treating silence as consent
 * actually asks us to be able to show.
 */
export const consents = pgTable(
  "consents",
  {
    id: id(),

    /**
     * **Nullable, and nulled at erasure** (ADR-0021).
     *
     * The proof has to outlive its subject: Ley 1581 requires the authorisation to be conserved, and
     * ADR-0008's hard-delete-by-default would otherwise force a choice between destroying evidence
     * and refusing an erasure. `RESTRICT` means the erasure sequence has to null this column
     * deliberately, with a line of code saying so, rather than a cascade doing it silently.
     *
     * **Null means: the Titular has been erased.** The row is still evidence, still reachable, and
     * still renderable — through `subject_key`.
     */
    personId: bigint({ mode: "bigint" }).references(() => persons.id, { onDelete: "restrict" }),

    /**
     * `HMAC-SHA256(secret, lowercase(trim(email)))` — the anchor that survives the delete
     * (ADR-0021).
     *
     * A Titular who disputes gives us their email; we hash it; we find their consents and the
     * `document_version` they were shown. A `public_id`-only anchor is cheaper on privacy and was
     * rejected because it proves only the *shape* of compliance — that a consent existed, on these
     * dates — while failing the one thing this evidence exists for, which
     * `docs/research/ley-1581-obligations.md` §3 states as being able to render back to a specific
     * person the exact consent artefact they were shown.
     *
     * Keyed rather than a bare digest, because a bare digest of an email is brute-forceable.
     * **The key can never be rotated**: re-hashing needs plaintext we no longer hold.
     *
     * One limitation, named rather than discovered: this is the email *at the moment the row was
     * written*. A Person who changes their address and then erases leaves older rows keyed to the
     * older one, so a later lookup needs the old address too. Any future email-change feature
     * inherits that.
     */
    subjectKey: text().notNull(),

    purpose: text({ enum: PURPOSES }).notNull(),

    /**
     * Whether the Person accepted. **Positively phrased**, per ADR-0008 — `is_refused` would turn
     * every read into a double negative, and the reads here are legal ones.
     */
    isGranted: boolean().notNull(),

    /**
     * When the decision was made — a domain timestamp kept separate from `created_at` (ADR-0008),
     * even though the two are equal for every row this ticket writes.
     *
     * They stop being equal the moment a decision is recorded from anywhere but the request that
     * caused it, and that divergence is precisely what an audit wants to see. The name is ADR-0008's
     * and covers a refusal too: it is the instant the grant was decided, not the instant it was
     * given.
     */
    grantedAt: timestamp({ withTimezone: true }).notNull(),

    /**
     * **Exactly one foreign key, and it points at a `disclosure`** (ADR-0007). That row pins the
     * _política_ and the _aviso_, so this single reference recovers the whole triple.
     *
     * That the target is a `disclosure` rather than any document version is not expressible as a
     * check constraint across tables; `@repo/consent` is the only writer and `consent.invariant.test.ts`
     * is what holds it.
     */
    documentVersionId: bigint({ mode: "bigint" })
      .notNull()
      .references(() => documentVersions.id, { onDelete: "restrict" }),

    /**
     * A **scoped** consent's subject, crossing a tier boundary by public identifier (ADR-0007).
     *
     * `disclose_contact` is granted per Offer, and `@repo/offers` at tier 5 calls down into
     * `@repo/consent` at tier 3 to write the row inside `acceptOffer`'s transaction. There is no
     * foreign key and there cannot be: ADR-0006's DAG forbids `consents` referencing `offers`. The
     * reference is the Offer's UUIDv7 `public_id`, which ADR-0003 already establishes as the
     * identifier that crosses module boundaries.
     *
     * **Null on every row this ticket writes** — the four signup purposes are account-wide.
     */
    subjectKind: text(),
    subjectPublicId: uuid(),

    ...createdAt(),
  },
  (t) => [
    check("consents_purpose_check", sql`${t.purpose} in (${inList(PURPOSES)})`),

    /** A subject is both columns or neither; half a reference identifies nothing. */
    check(
      "consents_subject_check",
      sql`(${t.subjectKind} is null) = (${t.subjectPublicId} is null)`,
    ),

    /**
     * The re-consent read, in index form: *this Person's latest decision about this Purpose.*
     *
     * ADR-0007 makes that query the hot one — anyone whose latest grant predates a Purpose's
     * required disclosure version is treated as not consented, and the check runs at authenticated
     * navigation. Descending on `granted_at` so the newest row is the first one the index walks.
     *
     * **`person_id` has no index of its own, deliberately.** ADR-0008 requires every foreign key
     * column to be indexed *unless it is already the leftmost column of an existing index*, which it
     * is here, and requires the absence to carry a comment at the table — because
     * absent-because-redundant and absent-because-forgotten look identical, and the duplicate-index
     * audit query cannot see prefix redundancy.
     */
    index("consents_person_id_purpose_granted_at_idx").on(
      t.personId,
      t.purpose,
      t.grantedAt.desc(),
    ),

    /** The erased Titular's lookup path — the only way back to a row whose `person_id` is null. */
    index("consents_subject_key_idx").on(t.subjectKey),

    index("consents_document_version_id_idx").on(t.documentVersionId),
  ],
);
