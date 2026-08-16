# Consent is per-purpose, append-only, and bound to a versioned disclosure

Ley 1581 turns consent into schema. Art. 9 requires authorization "obtenida por cualquier medio que
pueda ser objeto de consulta posterior"; art. 17(b) requires us to *conserve a copy*; art. 12
parágrafo requires proof of the disclosure that preceded it and delivery of that proof to the titular
on demand. A boolean column satisfies none of it.

So: **a `consents` row is an append-only record of one Person accepting or refusing one `Purpose` at one
moment, pointing at the exact document version they were shown.** Never updated; a change of mind is
a new row. The seven `Purpose` values are a closed vocabulary, and their metadata lives in code rather
than in a table.

## The seven purposes, and where each is consented

| `Purpose` | Required? | Consented at |
| --- | --- | --- |
| `account` | **yes** | signup |
| `transactional_messages` | **yes** | signup |
| `safety` | **yes** | signup |
| `suggestions` | no | signup |
| `news` | no | signup |
| `publish` | no | first publish |
| `disclose_contact` | no, and per-offer | send *and* acceptance — see below |

Five unticked checkboxes at `/signup`, never an "accept all" control. The SIC's *Formatos modelo*
(2022) requires each finalidad to be separately selectable, and D.1377 art. 7 forbids treating
silence as consent — so nothing is pre-ticked and nothing is bundled.

**Required is lawful here.** D.1377 art. 6's ban on *conditioning* an activity on consent applies
only to **sensitive** data, and we collect none (see the research in `docs/research/ley-1581-obligations.md`
§8). Ley 2300 art. 5 par. 2 separately forbids requiring consent to *commercial* messages while
expressly allowing those "estrictamente relacionados con el bien o servicio adquirido" — which is why
`transactional_messages` may be required and `news` may not.

`safety` is required because **Colombia has no legitimate-interest basis**. There is no lawful route
to moderating or investigating a Person who has refused it, so refusing it means there is no account.

Two purposes are consented **in context rather than at signup**, because they start a new finalidad
for data already held rather than accompanying a collection: `publish` at the moment of publishing,
`disclose_contact` per offer.

## Both sides of an Offer consent, at different moments

Issue #2 recorded that contact disclosure is consented "at acceptance". That is half of it. When B
accepts A's offer, **both** sets of contact details are exchanged — and A never consented to their
own disclosure, which was triggered by someone else's action.

- The **sender** grants `disclose_contact`, scoped to that offer, at the moment of **sending**. This
  is the last point at which A's data has not yet been committed to the exchange, and "si acepta,
  verá tus datos de contacto" is a truthful thing to say on the send form.
- The **recipient** grants it at **acceptance**.

Two rows, same purpose, same subject, different `person_id` and `granted_at`.

## Scoped consent crosses a tier boundary by public identifier

`consents` carries nullable `subject_kind` + `subject_public_id`. `@repo/offers` (tier 5) calls down
into `@repo/consent` (tier 3) to write the row inside the same transaction as `acceptOffer`.

There is no foreign key, and there cannot be: ADR-0006's DAG forbids `consents` referencing `offers`.
The reference is the offer's UUIDv7 `public_id`, which ADR-0003 already establishes as the identifier
that crosses module boundaries. The cost is referential integrity on a row that is evidence and is
never joined in a hot path.

This sits alongside, and does not replace, the log that ADR-0006 assigns to `@repo/offers`. They
answer different articles: `consents` answers art. 8(b) — *prove I authorised it* — and the log
answers art. 8(c) — *who received my data*.

**A naming correction falls out of this.** ADR-0006 calls that log the "contact-disclosure log", but
*Disclosure* now means the art. 12 artefact — what a Person was told before consenting. Two different
disclosures inside the same compliance module is the kind of overload that bites during
implementation, so `CONTEXT.md` names the offer-side event a **Contact Exchange** and reserves
*Disclosure* for the Ley 1581 sense. Read ADR-0006's "contact-disclosure log" as the
**contact-exchange log**; nothing about the decision changes.

## Documents are authored in the repo and frozen in the database

D.1377 art. 16 requires retaining **the model** of every aviso for as long as obligations derived
from it endure, and an export in 2029 must render back the exact text shown in 2026. Markdown in a
repo is pleasant to author and useless as evidence; a database table is evidence and miserable to
author. So both.

- Author as **one file per version** under `docs/legal/<slug>/<version>.md`, never edited once
  seeded. Not git history — art. 16 wants the addressable artefact, and a diff is not one.
- A seed inserts each file into `document_versions` and **fails the deploy** on a content-hash
  mismatch against an already-seeded version, so an edit-in-place is caught at deploy rather than
  discovered in a dispute.

`document_versions` holds `kind`, `slug`, `version`, `effective_from`, `body`, `content_hash`, unique
on `(slug, version)`. The three kinds are English identifiers with the statute in a comment, per
ADR-0001 as amended by this ticket:

| `kind` | Document | Source |
| --- | --- | --- |
| `processing_policy` | *política de tratamiento* | D.1377 art. 13 — six mandatory contents |
| `privacy_notice` | *aviso de privacidad* | D.1377 arts. 14–15 — a fallback, four contents |
| `disclosure` | what the Person was told before consenting | L.1581 art. 12 |

`disclosure` rows additionally pin the `processing_policy` and `privacy_notice` versions in force
when they were published.

**A `consents` row carries exactly one foreign key**, to a `disclosure` version, and that row pins the
other two. The whole triple is atomic and recoverable from one reference. Three separate FKs on every
consent row would be cheaper and would guarantee nothing about the three having been shown together.

There is one disclosure document **per consent surface**, not per purpose: `disclosure/signup`,
`disclosure/publish`, `disclosure/offer-send`, `disclosure/offer-accept`. Each declares which
purposes it collects. This is what makes the art. 12 trail reproducible per surface.

## Purpose metadata is code, not rows

`consents.purpose` is a constrained `text` column; `drizzle-zod` derives it per ADR-0006. The
metadata — whether a purpose is required, and which disclosure version is currently required for it —
is a frozen record in `@repo/consent`.

**Superseded by ADR-0008:** this said `pgEnum`. It is now `text({ enum: PURPOSES })` with an explicit
`check()` constraint — a plain `text` column in the database, the same `z.enum` under `drizzle-zod`,
and no `ALTER TYPE` the day an eighth *finalidad* appears. Nothing else in this ADR changes.

Bumping a required version is the mechanism by which a finalidad change invalidates existing consent.
It must therefore be **a code change that ships in the same commit as the markdown file and the
notification** — reviewable, revertable, and impossible to perform with an `UPDATE` against
production. A table would let the three drift apart, and the drift would be silent.

## Re-consent fails closed

D.1377 arts. 5 and 13 require notifying *before* implementing, and a changed finalidad requires new
authorization. So there is a window where a Person is consented to the old purpose and not the new
one, and the product must behave correctly inside it.

Anyone whose latest grant for a purpose predates that purpose's required disclosure version is
treated as **not consented**. The feature stops immediately — publications unpublish rather than keep
serving under a changed `publish` finalidad. At next authenticated navigation a non-dismissable
interstitial asks for **only the purposes that changed**.

The art. 5 notification is modelled as a send that must **precede** `effective_from`, so a version
cannot go live without its notice having gone out.

**The interstitial never gates `/my-data`, export, or deletion.** Blocking a rights surface behind a
consent request is exactly what `2.2.2.25.4.2`'s free-and-permanently-available rule exists to
prevent.

`disclose_contact` is exempt from the minimum-version check: it is granted fresh per offer, so there
is never a stale grant to invalidate.

## Revocation is immediate, and still recorded

Formally, revocation is a **reclamo** carrying a 15-día-hábil clock (D.1377 art. 9 =
`2.2.2.25.2.6`). That clock is a ceiling on us, not a licence to delay a toggle we can honour
instantly. So self-service revocation takes effect immediately **and** writes a `data_requests` row closed
in the same instant — the record is the evidence that we honoured it.

| Revoking | Effect |
| --- | --- |
| `suggestions`, `news` | Sends stop. Nothing else. |
| `publish` | All publications unpublish; drafts survive; new publishing blocked. |
| `disclose_contact` | Future acceptances blocked. **Past disclosures cannot be recalled**, and the UI says so — the recipient is an independent Responsable holding their own copy. |
| `account`, `transactional_messages`, `safety` | Not a toggle. Routed as **an erasure request**, with confirmation copy that says so plainly rather than quietly failing. |

Note that no article of Ley 1581 or Decreto 1074 Cap. 25 uses the words *revocatoria parcial* —
per-purpose revocation is derived from consent being granted per-finalidad (D.1377 art. 5) and from
the SIC's model formats. It is the safe design either way; it should not be cited to an article.

## The `persons` row is written before the Better Auth `users` row

Consent must exist "a más tardar en el momento de la recolección" (D.1377 art. 5), and the Better
Auth audit (issue #3) establishes that `DrizzleAdapterConfig.transaction` controls Better Auth's
*own* transaction — there is no documented way to enlist `signUpEmail` in a transaction we open. One
of the two rows lands first, and a crash between them leaves an orphan either way.

**Person-first.** Our transaction writes `persons` plus the three required `consents` rows, then
`auth.api.signUpEmail`, then sets `persons.user_id`.

The orphan this produces is a `persons` row holding personal data **with** its consent record — deletable,
and re-linkable by email on retry. User-first produces an orphan `users` row holding an email address with
**no consent record at all**, which is the precise art. 9 / 17(b) failure this whole design exists to
prevent.

This is ADR-0002's nullable `persons.user_id` behaving as designed rather than an edge case. A sweep
deletes unlinked `persons` rows older than an hour, and `databaseHooks.session.create.before` — which
the audit confirms can block sign-in — rejects any `users` row without a `persons` row.

The consequence for the UI: **one form, one submit**. The two-step wizard the research assumed is
what creates the hole.

## Date of birth is stored

The 18+ gate is a given (Ley 1581 art. 7 prohibits treating minors' non-public data, and no age of
digital consent exists in Colombian law — research §9). `persons.date_of_birth` is stored, never
displayed, and never present on a public type or a search filter, because age is a discrimination
vector.

Minimisation argues for an attestation checkbox instead. It is worth nothing the day a 16-year-old
signs up and we have to show what we asked — and it is the same *conducta inequívoca* the SIC rejects
for anything load-bearing.

## Routes

This ticket **amended ADR-0001**: its terms-of-art exception now covers prose and UI copy only. It
does not reach identifiers, and it does not reach routes. **Every route is English**, with no
exceptions to remember.

| Route | Was | Note |
| --- | --- | --- |
| `/legal/processing-policy` | `/legal/politica-de-tratamiento` | *política de tratamiento*, D.1377 art. 13 |
| `/legal/privacy-notice` | `/legal/aviso-de-privacidad` | *aviso de privacidad*, D.1377 arts. 14–15 |
| `/my-data` | `/mis-datos` | Top-level, not nested under `/account` |
| `/signup` | `/registro` | |

The route slugs deliberately match the `document_versions.kind` values, so a URL and a row name the
same artefact.

The cost is worth naming rather than glossing: these are **two documents with different statutory
contents**, and to an English speaker "processing policy" and "privacy notice" read like two names
for one thing — a distinction the Spanish preserves for free. Each page's own heading carries the
Spanish statutory name, which is where a reader needing the distinction will be looking, and every
citation of either document should quote that heading rather than the URL.

`/my-data` is top-level because `2.2.2.25.4.2` requires the rights channel to be easy to reach, and
burying it is the thing the rule exists to prevent. If issue #14 later introduces `/account`,
`/my-data` stays a top-level route rather than becoming a redirect.

This supersedes every Spanish route in `docs/research/ley-1581-obligations.md` and in the map, all of
which predate ADR-0001.

## A field-justification register is required

D.1377 art. 4 permits collecting only data "pertinentes y adecuados para la finalidad". The
discipline that makes this auditable is a markdown register in `docs/legal/`: one row per column
holding personal data, naming the purpose that justifies it. **Adding such a column requires adding a
row.** `persons.date_of_birth` → "age gate, Ley 1581 art. 7" is the first entry.

## What this does not settle

The `data_requests` entity, its Colombian business-day clock, `reclamo en trámite`, and the `/my-data`
surface itself — export contents, erasure semantics and the retention schedule. Those are separate
tickets, split out of issue #21.

Two points from the research remain open and are for counsel, not for engineering: the **physical
address and telephone** D.1377 art. 13(1) requires us to publish (a persona-natural-vs-S.A.S.
decision), and the **citation form** for the SIC's instructions (research §12 item 1) — the substance
of the deadlines is not in doubt, only where they are properly cited from.
