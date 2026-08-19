# Field justification register

**One row per column holding personal data, naming the _finalidad_ that justifies it. Adding such a
column requires adding a row.**

D.1377 art. 4 permits collecting only data _"pertinentes y adecuados para la finalidad"_. That is a
duty nobody can audit from a schema file, because a schema says what we hold and not why. This is the
discipline that makes it auditable, and ADR-0007 requires it.

It is a **legal artefact with a different audience** from the schema comments, not a duplicate of
them: `packages/db/src/schema/*.ts` explains a column to whoever is about to write a query against
it, and this explains it to whoever is asking whether we should be holding it at all. The two say
different things about the same column on purpose.

Related but distinct: `packages/db/src/lifecycle.ts` declares, per **table**, what an erasure does to
it and how long it is kept (ADR-0034). This register is per **column**, and answers _why do we have
this_ rather than _when does it go_.

## `persons` — `@repo/people`

| Column          | What it holds                       | _Finalidad_ that justifies it                                                                                                                                                                                                                    |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public_id`     | An opaque identifier for the row    | `account`. ADR-0003: the internal key would leak row counts and invite enumeration, so a Person is addressed from outside by this instead. Holds nothing about the human.                                                                        |
| `user_id`       | The Better Auth account, or null    | `account`. ADR-0002's seam — the one column where the domain touches the authentication library. Null during the signup window and after an account is deleted.                                                                                  |
| `full_name`     | The person's name, authored by them | `account`. It is what a stranger reads when deciding whether to work with them (ADR-0009), and the platform cannot introduce two people to each other anonymously.                                                                               |
| `date_of_birth` | A calendar date                     | **Age gate, Ley 1581 art. 7.** The article forbids treating a minor's non-public data and Colombia sets no separate age of digital consent. Never displayed, never a filter, never on a public type — age is a discrimination vector (ADR-0007). |

## `users`, `sessions`, `accounts` — `@repo/auth`, generated

Better Auth owns these columns and `auth generate` rewrites the file whole (ADR-0003), so the
justification is for the **table** rather than for our choice of columns.

| Column                 | What it holds                          | _Finalidad_ that justifies it                                                                                                                                                                     |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users.email`          | The address, unique                    | `account` and `transactional_messages`. It is the identity anchor (ADR-0009) and the only route back into a locked-out account, which is why every account has one.                               |
| `users.name`           | A copy of the authored name            | `account`. `NOT NULL` in Better Auth's schema and not removable; written from `persons.full_name`, never from a provider profile.                                                                 |
| `users.email_verified` | Whether the address was confirmed      | `account`. Gates publishing and Offers, not sign-in (ADR-0009).                                                                                                                                   |
| `users.image`          | Unused                                 | **None — and it is never written.** Part of Better Auth's core schema and not removable; the profile photograph is ADR-0010's separate, consented, sensitive-data surface and will not live here. |
| `accounts.password`    | A scrypt hash                          | `account`. Not a password: a hash nobody at Encuentra can reverse.                                                                                                                                |
| `sessions.ip_address`  | The address a session was created from | `safety`. Written by Better Auth; the sole use is investigating abuse. Goes with the account.                                                                                                     |
| `sessions.user_agent`  | The browser string                     | `safety`. Same as above.                                                                                                                                                                          |
| `accounts.*_token`     | OAuth tokens                           | `account`, **once ADR-0009's social credentials land (#71)**. Null on every row this ticket writes, because email and password is the only credential so far.                                     |

## `verifications` — `@repo/auth`, generated

| Column       | What it holds                                   | _Finalidad_ that justifies it                                       |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| `identifier` | A namespaced key, e.g. `reset-password:<token>` | `account`. Makes password reset single-use. Carries no address.     |
| `value`      | The `users.id` the token resolves to            | `account`. An internal identifier, not a personal datum on its own. |

`verifications` is classified `expires` in `lifecycle.ts` rather than `with-person`, and the register
should say why plainly: it has **no foreign key to `users`**, so an erasure walking the schema from
the subject cannot reach it. Its own `expires_at` is the only bound, and that is an hour.

## `consents` — `@repo/consent`

| Column                              | What it holds                           | _Finalidad_ that justifies it                                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `person_id`                         | The Titular, or null after erasure      | **Ley 1581 arts. 9 and 17(b)** — conserving proof of the authorisation. Nulled at erasure so the proof outlives the subject (ADR-0021).                                                                                |
| `subject_key`                       | `HMAC-SHA256(secret, lowercase(email))` | Same. It is what lets a Titular who disputes hand us an address and be shown the exact artefact they were given. Keyed rather than digested, because an email is a small enough space to be a lookup table (ADR-0021). |
| `purpose`, `is_granted`             | Which _finalidad_, and the answer       | Same. **The refusals are as load-bearing as the grants**: they are the evidence that the box was rendered, unticked and separately selectable (D.1377 art. 7).                                                         |
| `granted_at`                        | When the decision was made              | Same, and it is what proves consent was _previa_ under D.1377 art. 5.                                                                                                                                                  |
| `document_version_id`               | The Disclosure shown                    | **L.1581 art. 12 parágrafo** — proving _what we said_ is a separate duty from proving _that they agreed_.                                                                                                              |
| `subject_kind`, `subject_public_id` | An Offer, for a scoped consent          | `disclose_contact`. Null on every row this ticket writes.                                                                                                                                                              |

## `document_versions` — `@repo/consent`

**No personal data.** A row is a published legal document, identical for everyone who was ever shown
it — which is exactly why `consents` can carry one foreign key instead of a copy of the text per
person. Classified `impersonal`, kept indefinitely, because a five-year-old consent must still render
the text it was given against (D.1377 art. 16).

## `notification_outbox` — `@repo/notifications`

| Column            | What it holds                    | _Finalidad_ that justifies it                                                                                                                                                                                                  |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `recipient_email` | Where the message goes           | `transactional_messages`, and `news` for the one template that will need it. It is the message's address and there is no way to send without it.                                                                               |
| `token`           | A single-use authentication link | `account`. Added by #70 and **nulled the moment the row sends**: this table's rows live thirty days, and a verification token is a bearer credential that has no business at rest for twenty-nine days after it was delivered. |
| `last_error`      | The provider's own words         | `transactional_messages`. Debugging a delivery. May quote the recipient's address back at us, which is why it is redacted on the way to Sentry and kept verbatim in the column, inside the erasure net.                        |
