# Erasure: a real delete, a surviving proof, and no memory of a ban

ADR-0008 chose hard delete repo-wide and then deliberately stopped, handing this ticket the one table
it could not decide for: `persons` itself. ADR-0020 built the case file and the clock and left the
same gap — an erasure request _is_ a `data_requests` row, so the proof of compliance cannot die with
the subject it is about. `docs/research/moderation-record.md` supplied the law and one defect it
could not fix.

This ADR closes all three. Erasure **deletes**, the proof **survives on a key of its own**, and the
platform keeps **no memory of a ban** — that last one reversing the research's own recommendation,
on grounds the research did not have.

## Erasure deletes the row

**A _supresión_ under art. 15 hard-deletes the `persons` row.** Redaction in place was live until now:
ADR-0008 kept both options open precisely because it could not choose between them, and redaction is
genuinely cheaper — every foreign key stays valid, `RESTRICT` never fires, and none of the three
problems below exists.

It loses on a failure mode neither ADR had named. **Redaction is a denylist; deletion is not.**
Redacting in place means maintaining, forever, an enumeration of which columns on `persons` identify
someone. A column added in 2028 by someone who has not read this ADR is silently missed and nothing
fails. ADR-0017's reflective invariant guards the mirror-image hazard — a new _table_ referencing
`persons` — but it cannot guard a new _column_ on a row we deliberately keep, and no cheap test can:
"is this column identifying" is a judgement, not a schema property. A `DELETE` is complete by
construction and needs no list.

Beyond that it is simply what the statute says. `2.2.2.25.2.8` requires _supresión_ once the
_finalidad_ is met, and a redacted row is the tombstone ADR-0008 banned repo-wide, wearing better
manners.

## The proof outlives the subject, on a key of its own

`consents` and `data_requests` must survive the delete. ADR-0008 anticipated the shape —
_"a nullable FK or a different anchor"_ — and ADR-0020 declined to pick, so that both tables would
get one mechanism rather than two.

**Both: `person_id` becomes nullable and is set to `NULL` at erasure, and both tables carry a
non-null `subject_key` written at insert.**

```
subject_key = HMAC-SHA256(secret, lowercase(trim(email)))
```

The email, because ADR-0009 makes `users.email` the identity anchor. **This is the answer to the
defect `docs/research/moderation-record.md` carried forward**: that research argued for a keyed HMAC
over a bare digest because _"a plain SHA of a cédula is brute-forceable"_, reasoning from an
identifier this platform never collects — ADR-0010 refused document uploads and signup is name, date
of birth and a credential. The argument for keying survives the correction intact; only the input
changes.

A `public_id`-only anchor was the alternative and is cheaper on privacy: it proves the _shape_ of
compliance — a consent existed, an erasure happened, on these dates — while keeping nothing that
could re-identify anyone. It was rejected because it cannot do the one thing ADR-0007 built this
evidence for. `docs/research/ley-1581-obligations.md` §3 states the standard as being able to
_"render back to a specific candidate, on demand, the exact consent artefact they were shown"_. A
Titular who disputes gives us their email; we hash it; we find their consents and the
`document_version` they were shown. An unlinkable record answers the regulator and fails the person.

**The key can never be rotated.** Re-hashing needs plaintext we no longer hold. One long-lived
secret in Fly secrets (ADR-0005), and losing it makes every surviving proof unverifiable — which
puts it in the same class as the extensions problem #17 found: a backup that restores the database
and not the secret restores nothing that matters. Named here, owned by the backup and disaster
recovery work.

**One limitation, stated rather than discovered later.** The key is the email _at the moment the row
was written_. A Person who changes their email and then erases leaves older `consents` rows keyed to
the older address, so a later lookup needs the old email too. The erasure's own `data_requests`
row — the one that proves we complied — is always keyed to the current address, because erasure is
the moment we last know it. Any future email-change feature inherits this as a constraint.

## What the counterparty of an Offer keeps

An Offer is two people's data. B accepted work from A; A erases; B asked for nothing and is a Titular
too.

ADR-0015 makes this tractable: the Offer **copies** its terms rather than pointing at them, so
`publication_id` is provenance and nothing more. **Sever the person-side links — `sender_person_id`
and `publication_id` both become nullable — and the Offer stands alone.** A null on one side _is_ the
_cuenta eliminada_ placeholder: derived, never stored, following the precedent ADR-0015 set when it
derived `frozen` from `persons.status` rather than storing a copy that drifts.

**The Offer is kept whole.** Stripping the erased side's free text was the alternative and it
reintroduces exactly the denylist that decided the first section — an enumeration of "which columns
hold the erased side's words," silently incomplete the next time a column is added. The accepted
cost, named rather than implied: **if A erases in month 1, B holds A's words until the Offer's own
12-month term expires.** That is a real residue and the retention term is what bounds it.

The same rule runs through `reports`, in one direction only. A Report is both people's data, so:
the **reported** Person's erasure deletes it along with everything else about them, while the
**reporter**'s erasure severs the reporter link and leaves the Report standing — because it is the
reported Person's data and ADR-0020 gives them a standing right to see it.

## There is no memory of a ban, and that is the decision

`docs/research/moderation-record.md` recommends keeping a keyed HMAC, a timestamp and a coded reason
in a blocklist so a banned fraudster is recognised on return. **We build nothing.** The ticket left
this open explicitly, and the research's own recommendation rests on a premise this repo does not
have.

1. It catches only a fraudster who **reuses their email**. Against one who does not, it is worth
   exactly zero — and re-registration is where the effort of a returning fraudster goes.
2. ADR-0009 made signup free, instant and unlimited with no phone OTP, so re-registration already
   costs nothing. A blocklist does not raise that cost; it occasionally notices.
3. **It retains a coded fraud reason about a person who asked to be forgotten.** The research itself
   flags (§"What could not be verified", item 4) that art. 5's list is open — _"tales como"_ — and
   its test is data _"cuyo uso indebido puede generar su discriminación"_, which a fraud label in a
   labour-matching context plainly can. If it is _sensible_, art. 6 wants explicit consent we will
   never have. This is the reason that decides it.
4. We would have to **publish a retention term no source supports.** The research is unambiguous that
   no number exists in the regime and that Ley 1266's 4/8-year _caducidad_ must not be cited
   (art. 2(e) excludes it textually). Publishing a term we invented, for the record hardest to
   justify, is the worst place to spend that credibility.
5. ADR-0013 refused accumulation-driven auto-suppression on brigading grounds. A permanent ban record
   is the same shape and strictly worse, because the account is gone and there is nobody left to
   appeal.

**So v1 has no ban memory.** That is a real cost and it is not new: ADR-0008 already named it —
_"hard-delete a fraudster and they re-register tomorrow, because nothing survived to recognise
them"_ — and the map's fog schedules the ADR-0009 collision for the day reputation accrues, at which
point re-registration stops being cheap for reasons that actually work. This ADR confirms the gap
rather than patching it with a control that does not close it.

## Narrowing is not refusing

`docs/research/moderation-record.md` settles that Colombian law carries **exactly one** ground for
refusing erasure — `2.2.2.25.2.6`'s _deber legal o contractual de permanecer_, written into art. 8(e)
by C-748 resolutivo Cuarto. The ticket had guessed the list would also include an open request or
investigation in flight; it does not, and the three-limb list the research was sent to check is
Mexico's LFPDPPP art. 26.

We sign no contracts and move no money, so **the set is empty in practice and self-service erasure
always succeeds.**

| Outcome                                          | `outcome`  |
| ------------------------------------------------ | ---------- |
| Everything deleted                               | `answered` |
| Everything deleted, a minimum retained and named | `answered` |
| The Titular is told they cannot be erased        | `refused`  |

The middle row is the trap, and it is why this section exists: keeping less **is not** saying no.
Recording a narrowed erasure as `refused` would put a false statement in the one record the SIC
reads. With no blocklist the middle row now has no product path at all, but the distinction is
recorded because it is the natural mistake for whoever revisits this.

**`data_requests` gains a nullable `refusal_ground`**, `text({ enum })` + `check()` per ADR-0008,
with one value: `legal_or_contractual_duty`. A `CHECK` makes it non-null exactly when
`outcome = 'refused'`. No product surface can produce it; an operator can, and
`2.2.2.25.2.6` requires the refusal to be specific and documented if the impossible case ever
arrives.

## The retention schedule is declared where the table is

`2.2.2.25.2.8` requires us to **publish** a retention schedule, to **honour** it, and — as a duty in
its own right — to **document** the procedures. The hazard is the one every published schedule has:
the document and the code drift, and nobody notices until a regulator reads both.

ADR-0017 already forces every table to declare an **erasure classification where the table is
defined**, in `@repo/db`'s `src/columns.ts` helpers, and enumerates them reflectively. **The
retention term joins that same declaration** — one declaration carrying both facts, not two that can
disagree — and **the published table in the _política_ is generated from it**. The document and the
code cannot drift because there is only one of them.

This follows ADR-0020's holidays-are-a-constant reasoning: reference-data machinery in service of an
array is not worth a table, a migration and a seed.

> **ADR-0034 moves the declaration and names its values.** Not `src/columns.ts` — a lifecycle is a
> table-level fact and one schema file is generator-owned — but `packages/db/src/lifecycle.ts`, one entry
> per table, still one declaration carrying both facts. The four behaviours the table below describes in
> prose become `with-person`, `links-severed`, `evidence` and `impersonal`, joined by **`expires`** for
> personal data erasure cannot reach: `verifications` and `rateLimit` are in scope for the generated
> _política_ table for the first time, which is the point.

| Data                                                        | Erasure       | Term                                                   |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| `persons`, contact details                                  | with Person   | account lifetime                                       |
| `publications`, `capability_profiles`, `needs`, skill links | with Person   | account lifetime                                       |
| Photo row and object                                        | with Person   | account lifetime; rejected bytes at once (ADR-0010)    |
| `users`, `sessions`, `accounts`                             | with Person   | account lifetime (cascade)                             |
| `verifications`                                             | with Person   | expiry (**no foreign key** — see below)                |
| `blocks`                                                    | with Person   | while both accounts live                               |
| `offer_send_attempts`                                       | with Person   | 12 months                                              |
| `offers`                                                    | links severed | 12 months from terminal state                          |
| `reports` — dismissed                                       | see above     | 12 months from dismissal                               |
| `reports` — actioned                                        | see above     | while the Suspension is live, + 24 months              |
| `consents`                                                  | evidence      | 5 years from account closure                           |
| `data_requests`                                             | evidence      | 5 years from `resolved_at`                             |
| `skills`, `municipalities`, `denominations`, documents      | impersonal    | none — reference data and the texts evidence points at |

**The five-year figure is our own proportionality judgement and is flagged as provisional.** The
research is explicit that no number exists in the regime and that whatever we pick is defensible only
if documented in advance. The reasoning: the exposure the consent evidence exists to survive is the
SIC's sanctioning power, which I believe **CPACA (Ley 1437 de 2011) art. 52** caps at three years
~~from the act~~ — so five covers the window with margin while anything longer starts failing
_razonable y necesario_. ~~**That article was not read**, and a follow-up issue carries the
verification, exactly as ADR-0020 filed #41 for the holiday list.~~ The shape of this decision does
not change with the number; the number is one constant in one file.

> **Verified by [#44](https://github.com/m0t0r/workforpereira/issues/44) — the number holds, the
> reasoning changes.** `docs/research/cpaca-sanctioning-term.md` read the article. Three corrections
> to the paragraph above, none of them to the figure.
>
> **Art. 52 reaches Ley 1581 by two independent routes**, which matters because "does the general
> code bind a statutory-law regime" is the obvious challenge to this whole anchor. Ley 1581 art. 22
> inciso 2 remits expressly to the _Código Contencioso Administrativo_, and C-748 de 2011 upheld art.
> 22 **because of** that _reenvío_; independently, CPACA art. 47 applies Parte Primera to any
> sanctioning procedure _"no regulado por leyes especiales"_. **Neither Ley 1581 nor título
> 2.2.2.25 prescribes a _caducidad_** — a negative finding from reading both through — so art. 52's
> opening _"Salvo lo dispuesto en leyes especiales"_ has nothing to bite on.
>
> **The clock runs from cessation, not from the act.** Inciso 2 counts a _conducta continuada_ from
> the day after the infringement stops. Holding data without valid consent evidence is continuing
> conduct, so the term starts at account closure and at `resolved_at` — **the two anchors this table
> already uses**, which are therefore load-bearing rather than convenient.
>
> **Three years is a floor, not the whole exposure.** The sanction must be _expedido **y
> notificado**_ inside the term, so the _formulación de cargos_ does not stop the clock; nothing
> tolls it (no interruption or suspension rule exists in arts. 47–52, and a _reclamo_ in flight
> compresses the window rather than extending it, art. 16 making it a _requisito de
> procedibilidad_); and CPACA art. 164.2(d) then gives the sanctioned party four months to sue with
> the contentious action running after that. **Five is the floor plus the litigation tail.** Four
> years is the tightest number defensible; six starts failing _razonable y necesario_.
>
> **One inference in the research is unsourced, and it is the first thing to put to counsel**: no
> Colombian source characterises unlawful retention as _conducta continuada_ under art. 52. The
> alternative reading closes the SIC's window **earlier**, which makes five years more than enough
> rather than less — the safe direction to be wrong in.

**The purge jobs are specified here and scheduled by #15**, the same split ADR-0020 used for its
deadline alarm. Each is a delete over one table against its declared term, and each pings
Healthchecks.io so that a job which stops running alarms too.

> **Completed by ADR-0028, with one correction to the shape.** Scheduled daily on trigger.dev Cloud,
> reached over an authenticated callback, pinging Healthchecks.io as this ADR requires. The purge is a
> single reflective function in **`@repo/db`**, reading the declarations this section puts beside each
> table — so a new table is purged without anyone remembering to add a job, which is the property
> ADR-0017's erasure invariant already bought.
>
> The correction: _"a delete over one table"_ understates it. Under ADR-0008's `RESTRICT` default the
> reflection needs a **topological order** over the foreign keys and must delete **leaf-first**, exactly
> as the erasure sequence below does. A flat list of tables would fail on the first table anything else
> references.

## The erasure sequence

**Erasure is immediate. There is no grace period.** A scheduled-delete row is data we were told to
delete and are still holding — the soft-delete instinct ADR-0008 banned, wearing a clock.

The mis-tap risk is real and this audience is the one #30 and #35 exist to protect, so the answer is
the reversible door we already built: **the confirmation offers Pause at equal visual weight**
(ADR-0011 — _"stepping out without leaving"_). Equal weight is not decoration. It follows ADR-0015's
rule for the Offer decline escape, and it is what keeps offering an alternative from becoming
obstruction of a right `2.2.2.25.4.2` requires to be _de fácil acceso_. It is offered once, and never
again after the Person has chosen.

**One transaction.** ADR-0007 established that Better Auth's server API runs its **own** transaction
and cannot enlist in ours, and accepted an orphan window at signup as the price. Erasure cannot take
that deal: a half-erased Person against a 15-business-day statutory clock is a breach, not an
inconvenience. So the Better Auth rows are deleted through a `@repo/auth` module function taking
`Db | Tx`, not through Better Auth's API — ADR-0006's _only the owning module writes to its own
tables_ is satisfied, and the transaction boundary stays where ADR-0006 put it.

Leaf-first, per ADR-0008's explicit-ordering rule; `sessions` and `accounts` need no line of their
own because `docs/research/better-auth-audit.md` §3.3 confirms both are `ON DELETE CASCADE` to
`users.id`. The object-store step is ADR-0010's and runs **after** commit, with its reconciliation
sweep as the net.

> **`verifications` has no foreign key, and ADR-0017's invariant cannot see it.** The audit (§3.3)
> records it as a shared bucket keyed by `identifier` — which for our flows _is the email_. So it
> holds personal data, is unreachable by cascade, and **the reflective erasure test will never
> enumerate it, because that test finds tables by their foreign key to `persons`.** It is deleted
> explicitly by `identifier`, and it gets its own named assertion in the erasure invariant rather
> than trusting enumeration. This is the first known hole in that guard and it is unlikely to be the
> last: any future table holding an email rather than a `person_id` has the same shape.
>
> **Closed by ADR-0034, and the prediction held twice over** — Better Auth's `rateLimit` and ADR-0032's
> failed-sign-in counter are the second and third. The invariant now enumerates **every** table, so
> `verifications` needs no named assertion: it declares `with-person` in `packages/db/src/lifecycle.ts`
> and is asserted empty like everything else, because a single-subject fixture makes "no rows for this
> subject" and "no rows at all" the same assertion. It is still deleted explicitly by `identifier`.

## The `/my-data` surface

This ADR specifies the information architecture and hands the visual design to #12 and #35, which
own that vocabulary. The ticket's own `## Skills` named `/prototype` for the surface and **this is a
deliberate departure from it**: prototyping earns its place when _how should it look or behave_ is
the key question, and ADR-0020 had already fixed the hard part — `/my-data` shows every category,
always, instantly, safety records included, because the latency asymmetry would otherwise be the
disclosure.

| Section                             | Shows                                                                                  | Writes a `data_requests` row |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- |
| Mi cuenta                           | name, date of birth, email, Contact Details, municipality, account status              | no                           |
| Lo que publico                      | Publications, Skills, Self-description, Photo and its review state                     | no                           |
| Mis autorizaciones                  | every Consent, current state **and full history**, each linked to the Disclosure shown | on revoking, closed at once  |
| Quién recibió mis datos de contacto | derived from `offers.accepted_at`                                                      | no                           |
| Mis propuestas                      | Offers sent and received, and their states                                             | no                           |
| Seguridad                           | Reports about me at reason-code / date / action grain; my Blocks; my own answer        | on requesting the substance  |
| Mis solicitudes                     | my Data Requests, their state and deadline; the Complaint Legend if live               | no                           |
| Correct · revoke · pause · delete   | the operations                                                                         | on revoking and on erasure   |

Viewing writes nothing (ADR-0020). _Quién recibió mis datos de contacto_ is the art. 8(c) answer —
_"a quién se le ha suministrado"_ — and it exists only because ADR-0015 collapsed the
contact-exchange log into `offers.accepted_at`. **That collapse is now load-bearing for a statutory
right**, which it was not when ADR-0015 made it.

## Export is deferred; the duty is not

**Self-service export leaves v1** and is filed as its own ticket. The art. 12 _parágrafo_ duty to
hand the Titular _copia_ of the proof of the art. 12 disclosure is **not** deferred with it: it is
discharged by ADR-0020's operator path, where a request arrives at the published contact address and
an operator produces the artefact inside the 10-día-hábil clock. What is deferred is the
self-service button, not the right, and the _política_ must describe the channel that actually
exists.

One constraint the eventual export inherits, recorded now while the reasoning is fresh: it must carry
the **rendered text of every Disclosure version accepted**, not merely the fact of acceptance. Art.
12 _parágrafo_ entitles the Titular to a copy of the proof, and ADR-0007 already stores those texts
per version, so the artefact is an assembly rather than a re-render.

## The _manual interno_ has a home

ADR-0020 left art. 17(k)'s written internal manual explicitly homeless — _"#27 owns the retention
schedule, #15 owns the runbook, neither owns this"_. **This ADR specifies its contents; a task ticket
carries the writing**, because writing a legal document into `docs/legal/` is doing, and this map
plans. `2.2.2.25.2.8` makes documenting the _tratamiento, conservación y supresión_ procedures a duty
in its own right, and this ADR decides those procedures — so its largest chapter is already written
above.

It must cover: ADR-0020's manual identity path and its redaction wording, ADR-0020's deadline alarm
procedure, the erasure sequence and the narrowing above, and the retention schedule with its purge
jobs.

## What this does not decide

- **Export contents, format and delivery** — its own ticket, post-v1.
- ~~**The CPACA art. 52 anchor** behind the five-year evidence term — a follow-up issue.~~ **Now
  decided by [#44](https://github.com/m0t0r/workforpereira/issues/44)**: the article was read, the
  term is unchanged and no longer provisional, and the retention table's reasoning is corrected
  above. What remains open is the one unsourced inference named there, which is a question for
  counsel alongside #23 rather than an architectural decision.
- **Backup and disaster recovery**, which now inherits a second irreplaceable secret alongside #17's
  extensions problem: the HMAC key, unrotatable and worthless to restore a database without.
- **An email-change feature**, which inherits the subject-key limitation above.

## Consequences

- **ADR-0008 is completed, and amended in one place.** Its erasure question is answered — hard
  delete — and the constraint it predicted lands: **`consents.person_id` becomes nullable**, joined
  by `data_requests.person_id`, with `subject_key` as the anchor that survives. Its `RESTRICT`
  default and explicit leaf-first ordering are untouched and are what make the sequence auditable.
- **ADR-0015 is amended.** `offers.sender_person_id` and `offers.publication_id` become **nullable**,
  severed on erasure, with the _cuenta eliminada_ placeholder derived from the null. Its five
  terminal states are untouched.
- **ADR-0017 is amended twice.** The lifecycle declaration it requires now carries **both** the
  erasure classification and the retention term, in one declaration; and its reflective erasure
  invariant is recorded as **unable to reach `verifications`**, which needs a named assertion of its
  own. Per ADR-0017's rule that an ADR requiring a test names the file: the erasure invariant is
  extended at `packages/db/src/erasure.invariant.test.ts`, and a new
  `packages/db/src/lifecycle.invariant.test.ts` asserts that every table declares both facts.
- **ADR-0020 is completed.** It inherits the anchor it deferred, for `data_requests` and `consents`
  alike; gains `refusal_ground`; and its homeless _manual interno_ has an owner.
- **ADR-0013 is amended** — see below.
- **ADR-0007's stale cross-reference is corrected**: the instantly-closed `data_requests` row is the
  pattern **ADR-0020** reuses for an export, not ADR-0019, which is the formatter.
- **`CONTEXT.md`** gains **Erasure**; **Suspension**, **Pause** and **Offer** are amended.
- **The ticket's profile-view audit log is recorded as retired, not decided here.** ADR-0011 declined
  it (the log is cited to arts. 4(g)/17(d), not 8(c), and a signed-in Person reading a published
  profile is an _authorised_ access) and ADR-0013 declined the abuse-investigation version. The
  constraint the ticket asked to state against #22 was likewise already discharged by ADR-0011's
  public tier.
- **#15 inherits** the purge jobs and their Healthchecks.io pings, alongside ADR-0020's deadline
  alarm, and one more secret that must exist in every environment.

> **Amends ADR-0013 and `CONTEXT.md`'s Suspension entry.** _"The Person and the evidence are
> **retained**, not deleted"_ is too strong. It holds for an ordinary suspension, which is the common
> case and which this ADR does not touch. It does **not** hold against an art. 15 _supresión_
> reclamo: a suspended Person who asks to be erased **is erased**, completely, and the platform keeps
> **no record that the suspension ever happened**. ADR-0013's justification for retention —
> _"a Person deleted outright simply registers again tomorrow"_ — is true and is not a lawful reason
> to refuse, per `2.2.2.25.2.6` and C-748 resolutivo Cuarto.
>
> ADR-0013's _deliberately does not decide_ item 1 is now decided, and the rest of that ADR is
> confirmed: Reports rooted on a Person, suspension as a retained `persons.status`, and no automatic
> state transition — the last now doing constitutional work through C-748 §2.6.5.2.6's bar on
> adverse effects grounded _únicamente_ in a database record.
