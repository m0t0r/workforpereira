# Every table declares its lifecycle, and one word admits what erasure cannot reach

ADR-0017 built the guard that matters most in this repo: a test that finds tables **reflectively**,
so a table added in 2028 by someone who never read the ADR joins the erasure test the day it is
written. It finds them by their foreign key to `persons`.

ADR-0021 found the first table that guard cannot see — `verifications`, which has no foreign key and
whose `identifier` for our flows _is the email_ — and recorded it as an open defect: _"the first known
hole in that guard and it is unlikely to be the last."_ ADR-0032 found the second, Better Auth's
IP-keyed `rateLimit`, and declined to widen the invariant for it.

**This ADR closes the hole.** The enumeration becomes **every table in the schema**, the declaration
moves to one file, and the vocabulary gains the word that lets a table with no reachable subject be
written down honestly.

## Three instances, not two

The ticket said two. There are three, and the third is the one that makes this urgent:

| Table                             | Holds                                    | Why the foreign key is absent                                                       |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `verifications`                   | an email address, as the row key         | Better Auth's shared bucket, keyed by string                                        |
| `rateLimit`                       | an IP address and a counter              | an IP belongs to no account                                                         |
| ADR-0032's failed-sign-in counter | `HMAC(email)` — ADR-0021's `subject_key` | **deliberately** unlinked, so a refusal window cannot signal that an account exists |

The third is ours, is being added right now, and is keyed on the exact value ADR-0021 uses to _find a
person's records after their row is gone_. A guard that cannot see it is not describing a rare edge;
it is missing the shape the codebase is actively producing. Each of these is a table holding personal
data that nobody was forced to think about — which is the precise failure ADR-0017's reflection exists
to prevent, arriving through the one door it left open.

## The enumeration is every table

`packages/db/src/lifecycle.invariant.test.ts` — the file ADR-0021 already commissioned — reads every
table out of the drizzle schema object and **fails on any table with no lifecycle declaration**. Not
tables with a foreign key to `persons`: every table.

The foreign key was never a detector of personal data. It is a **reach mechanism** — the thing that
tells erasure which rows are this subject's — and ADR-0017 used it as a proxy for "does this table
concern a Person" because at the time the two coincided. They do not coincide, three times over, and
the proxy fails silently in the only direction that matters.

There is a second reason, which is legal rather than architectural. ADR-0021 requires the published
retention schedule in the _política_ to be **generated from these declarations**, so that the document
and the code cannot drift. A schedule generated from a set that structurally excludes `verifications`
and `rateLimit` is an incomplete `2.2.2.25.2.8` disclosure, produced by a mechanism whose whole selling
point is that it cannot be incomplete.

**This was cheap today and would not have been.** ADR-0017's testing lane is unbuilt, `src/schema/`
holds no table, and the declarations do not yet exist to migrate. The same change against
twenty-five live tables is a sweep through all of them.

## One file, and why it is not beside the table

ADR-0017 said the classification is _"declared where the table is defined"_, in ADR-0008's spreadable
`columns.ts` helpers. Two things make that impossible, and the second is the interesting one:

1. A lifecycle is a **table-level** fact. `columns.ts` spreads columns, and there is no column here.
2. **`packages/db/src/schema/auth.ts` is generator-owned.** `docs/research/better-auth-audit.md` records
   that `auth generate` is _"a full-file overwrite for Drizzle, never a merge"_. A declaration written
   beside those five tables is deleted by a routine command, with no diff anyone reads and no failure —
   which is exactly the silent forgetting this ADR exists to remove, reintroduced by the mechanism
   meant to prevent it.

So the declaration lives in **`packages/db/src/lifecycle.ts`**: one entry per table, two fields.

```ts
export const lifecycle = {
  persons: { erasure: "with-person", term: "account lifetime" },
  consents: { erasure: "evidence", term: "5 years from account closure" },
  offers: { erasure: "links-severed", term: "12 months from terminal state" },
  verifications: { erasure: "with-person", term: "expiry" },
  rateLimit: { erasure: "expires", term: "1 hour" },
  municipalities: { erasure: "impersonal", term: "none" },
  // …
} satisfies Record<string, Lifecycle>;
```

**ADR-0017's objection to a hand-written list does not apply here, and the distinction is the load-bearing
part of this ADR.** That objection — _"a hand-written list is the same forgetting moved one file
across"_ — is about a list that is **also the enumeration**: forget the line and the table is simply not
tested, silently. Here the enumeration stays reflective and the declaration is what is hand-written, so
forgetting the line is a **red build**. A list you cannot forget is not the thing that was rejected.

The accepted cost, stated rather than discovered: you do not see the declaration while writing the
table. You see it about ten seconds later, when the test fails and names the table.

The enumeration is over drizzle table objects only — `is(x, PgTable)` over the schema module's exports,
so enums, relations and views are skipped. `drizzle.__drizzle_migrations` lives in its own schema and
never appears.

## The vocabulary, and the word that admits a limit

| `erasure`       | Means                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `with-person`   | the subject's rows are deleted by the erasure sequence                              |
| `links-severed` | the row survives with its person link nulled (ADR-0021: `offers`, `reports`)        |
| `evidence`      | the row survives on `subject_key`, `person_id` nulled (`consents`, `data_requests`) |
| `impersonal`    | no personal data — reference data and the texts evidence points at                  |
| `expires`       | **personal data erasure cannot reach, bounded only by its own term**                |

The first four are ADR-0021's retention table, given names. `expires` is new, and it is the point of
this ADR.

`rateLimit` cannot be `with-person`: a row keyed on an IP has no subject to delete it by, and acquiring
one would mean tracking which addresses belong to which Person — worse than the problem. It cannot be
`impersonal` either, because an IP address is personal data. Before this word, whoever added it had **no
truthful thing to write**, and the observable consequence is what actually happened twice: they wrote
nothing, in prose, in an ADR, where no test reads it.

So `expires` is not a category of data. **It is an admission**: this table holds personal data, an art. 15
_supresión_ will not reach it, and the only thing bounding it is that it clears itself. Forcing that
sentence to be written at the moment the table is created — while the author still has the context — is
the entire value. It is then published, because the _política_ table is generated from these
declarations, which is the right amount of discomfort for the claim being made.

**A test enforcing a ceiling on `expires` terms was considered and rejected.** A rule that `expires`
implies a term under twenty-four hours is mechanically trivial and fires approximately never, and its
absence costs nothing: the term sits on the same line as the word, in one file, and any `expires` with a
term in months is visible to a reviewer and published in a legal document. A rule nobody's mistake will
ever trip is a rule that only has to be explained.

## Erasure gets simpler, not wider

The erasure invariant stops reflecting over the foreign-key graph and **walks the declaration instead**:
every `with-person` table must be empty after erasure, every `evidence` table must still hold its row.

That works because of a property of ADR-0017's own harness. Integration tests get an isolated database
and a per-test savepoint, so a fixture seeds **one** Person — and "no rows left for this subject" and "no
rows left at all" are then the same assertion. **The test never needs to know how a table is keyed.**

Three things follow. `verifications` loses the bespoke named assertion ADR-0021 gave it and rejoins the
enumeration like everything else. ADR-0032's sign-in counter is covered the day it is written, by nobody's
effort, which is the property ADR-0017 was buying in the first place. And the erasure invariant gets
_shorter_ — the widening deletes reflection code rather than adding it.

**The erasure sequence itself stays hand-written and leaf-first**, per ADR-0008. The declaration feeds the
_test_, never the delete. Making erasure reflective the way ADR-0028 made the retention purge was the
obvious next step and is refused: ADR-0008 is explicit that the explicit ordering _"is what makes the
sequence auditable"_, and erasure runs against a 15-business-day statutory clock with a person waiting.
A purge that nobody is watching can afford to be derived; the operation we would have to explain to the
SIC should say out loud what it deletes and in what order.

## What this does not decide

- **Personal data that has left the database.** The invariant reads a drizzle schema; it can only ever
  guard tables. R2 objects, Sentry, trigger.dev payloads, Cloudflare logs and the email provider are
  outside its reach by construction, and the map's fog on _what an erasure cannot reach once it leaves the
  database_ still owns them. `expires` is not a licence to treat that gap as covered.
- **The grain of the published _política_ table.** ADR-0021 owns the generated document and already writes
  it at category grain — _"persons, contact details"_ is one row over several tables. The declaration is
  its input, not its layout, and adding a third field for a Spanish-facing label is a decision for
  whoever writes the generator.

## Consequences

- **ADR-0017 is amended in two places.** Its erasure invariant's enumeration widens from _tables with a
  foreign key to `persons`_ to **every table**, split across two files: `lifecycle.invariant.test.ts` asks
  _did you declare_, `erasure.invariant.test.ts` asks _did erasure work_. And its
  _"declared where the table is defined"_ location rule becomes **one file, `packages/db/src/lifecycle.ts`**,
  because a generator owns one of the schema files. Its reflective principle is untouched — it is what
  makes this affordable.
- **ADR-0021 is completed.** Its _"first known hole"_ is closed, `verifications` no longer needs a named
  assertion of its own, and the `lifecycle.invariant.test.ts` it commissioned gets the scope and the
  vocabulary it was missing. Its retention table and its five-year evidence term are unchanged; the four
  behaviours it described in prose are now four values.
- **ADR-0032 is amended, narrowly.** Its refusal to widen stands **for the invariant it was talking about**:
  the erasure test is not widened here, and a short-lived IP counter still has no business in a test about
  whether a Titular's data survived erasure. What widens is the declaration guard, which is a different
  test asking a different question. Its `rateLimit` row declares `expires` / 1 hour; its failed-sign-in
  counter declares `with-person`, reached by `subject_key` and asserted by the same single-subject fixture
  as everything else.
- **ADR-0008 is untouched.** `RESTRICT` by default, explicit leaf-first ordering, and the hand-written
  erasure sequence all survive intact, and the last of those is defended above against the reflective
  version.
- **`CLAUDE.md` is corrected.** Its testing section currently says _"adding a table with a foreign key to
  `persons` requires declaring its erasure classification beside the table definition"_ — wrong on both
  halves after this ADR.
- **No `CONTEXT.md` change.** An erasure classification is engineering vocabulary, which ADR-0017 already
  settled belongs in `CLAUDE.md` rather than the product glossary.
- **Whoever adds a table inherits one line**, and cannot merge without it.
