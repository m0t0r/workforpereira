# The authored legal documents

**Nothing in this directory has been reviewed by a lawyer, and no version here may be marked
effective until it has been.** Every file carries a `[PENDIENTE: …]` marker wherever it states a fact
about the Responsable that only counsel and the business-shape decision can supply — the legal name,
the physical address, the telephone, the attention channel, and the list of subprocessors that
D.1377 art. 13(1) and the transmission contracts require.

ADR-0007 named two of these as open and for counsel rather than engineering: the **physical address
and telephone** D.1377 art. 13(1) requires us to publish, which is a
_persona natural_-versus-S.A.S. decision, and the **citation form** for the SIC's instructions. This
directory does not close them; it makes them visible in the one place a reviewer will look.

## How a document works

ADR-0007 wants both halves of a thing that neither markdown nor a database does well alone. D.1377
art. 16 requires retaining the model of every _aviso_ for as long as obligations derived from it
endure, and an export in 2029 must render back the exact text shown in 2026. Markdown in a repo is
pleasant to author and useless as evidence; a table is evidence and miserable to author.

So:

- **The text is authored here**, one file per version, at `docs/legal/<slug>/<version>.md`.
- **Each file declares itself in YAML front matter** — `kind`, `slug`, `version`, `effectiveFrom`,
  and for a disclosure also `surface` and the `pins` naming which _política_ and _aviso_ versions it
  froze. There is **no catalogue in TypeScript**: `readAuthoredDocuments` discovers every file in
  this directory, so a document cannot be authored and then silently never seeded, and an entry
  cannot name a file that does not exist.
- **`pnpm --filter @repo/consent seed-documents` freezes each file into `document_versions`** and
  **fails on a mismatch** against a version already seeded — on the body's content hash, and
  separately on its metadata.

A file looks like this:

```md
---
kind: disclosure
slug: disclosure-signup
version: "2026-08-19"
effectiveFrom: "2026-08-19T00:00:00.000Z"
surface: signup
pins:
  processingPolicy: { slug: processing-policy, version: "2026-08-19" }
  privacyNotice: { slug: privacy-notice, version: "2026-08-19" }
---

# Información al titular — creación de cuenta
```

The front matter is **not** part of the body: it is stripped before hashing, before freezing and
before rendering, so it never reaches `document_versions.body` and a Titular never sees it.

## The rule that matters

**A seeded version is never edited.** Not for a typo, not for whitespace. The seed hashes the raw
bytes of the body with no normalisation, so any edit at all to a frozen file fails the deploy — which
is the point: an edit-in-place is caught at deploy rather than discovered in a dispute, and "only
whitespace changed" is a claim the seed is not in a position to verify.

**The front matter is as frozen as the text.** It is outside the content hash, so a separate check
compares a seeded version's `kind` and `effectiveFrom` against the row and fails with
`DocumentMetadataMismatchError`. Moving a frozen version's `effectiveFrom` would rewrite the instant
ADR-0007 requires the art. 5 notification to have preceded — a date somebody may have to defend.

To change a document, author a **new version file** with a new `version` in its front matter, and —
where a _finalidad_ actually changed — bump that Purpose's `minimumDisclosureVersion` in
`purposes.ts` in the **same commit**. That bump is what invalidates every existing consent for the Purpose and triggers
ADR-0007's re-consent, which fails closed: the feature stops until the Person is asked again.

ADR-0007 also models the art. 5 notification as a send that must **precede** `effective_from`, so a
version cannot lawfully go live without its notice having gone out first.

## What is here, and what is deliberately not

| slug                | kind                | document                                     |
| ------------------- | ------------------- | -------------------------------------------- |
| `processing-policy` | `processing_policy` | _política de tratamiento_ — D.1377 art. 13   |
| `privacy-notice`    | `privacy_notice`    | _aviso de privacidad_ — D.1377 arts. 14–15   |
| `disclosure-signup` | `disclosure`        | what `/signup` says before any box is ticked |

`disclosure-publish`, `disclosure-offer-send`, `disclosure-offer-accept` and `disclosure-photo` are
**not here**, and their absence is a decision rather than an oversight: each lands with the ticket
that builds its surface, because a Disclosure has to describe something that exists. Freezing one now
would put into the evidence table a description of a feature nobody can use.

## Language

**Spanish**, and this is the one place where that is not merely allowed but required. ADR-0001
confines Spanish to what a user reads; these documents are read by a Titular and by the SIC. The
`tú` register follows the product's voice rules. Only the slugs, the `kind` values and this README
are English, and the routes match the `kind` values so that a URL and a row name the same artefact:
`/legal/processing-policy`, `/legal/privacy-notice`.

## The field-justification register

`docs/legal/field-justification.md` holds ADR-0007's other requirement: one row per column holding
personal data, naming the _finalidad_ that justifies it under D.1377 art. 4. **Adding such a column
requires adding a row.**
