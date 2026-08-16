# Data-subject requests: two procedures, a frozen clock, and a legend that blocks nothing

Ley 1581 gives the Titular six rights and gives us two procedures to answer them in, each with its
own deadline counted in _días hábiles_ on the Colombian calendar. ADR-0007 built the consent
evidence and named `data_requests` without designing it. This ADR designs the entity, the clock, and
the machinery that hangs off it.

Three of the premises this ticket started from turned out to be wrong, and each correction made the
design smaller. **Art. 18(i) does not require us to stop circulating contested data**, so the
`reclamo en trámite` legend suppresses nothing. **The legend does not need to be stored**, so the
2-día-hábil term to apply it cannot be missed. And **the holiday calendar does not need to be a
table**, because a frozen deadline is read once and never joined.

## Two procedures, five subjects

`data_requests` carries **two columns, not one enum**.

| Column      | Values                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| `procedure` | `inquiry` (_consulta_, L.1581 art. 14) \| `complaint` (_reclamo_, art. 15) |
| `subject`   | `access` \| `rectification` \| `erasure` \| `revocation` \| `duty_breach`  |

The flat four-value enum this ticket proposed — `inquiry`, `complaint`, `revocation`, `erasure` —
**mis-states the statute**. `D.1074 art. 2.2.2.25.2.6` says revocation and erasure are exercised
_"mediante la presentación de un reclamo, de acuerdo con lo establecido en el artículo 15"_. They are
not siblings of `complaint`; they are kinds of it, and they inherit the whole art. 15 procedure — the
15+8 clock, the day-after count, the 5-day cure, the 2-día legend. A flat enum makes that inheritance
invisible and duplicates it across three values, so the day someone gives `revocation` its own term
by accident, nothing catches it.

**`procedure` is the only input the clock and the legend ever read.** That is the whole point of the
split: the law has two procedures, so the deadline logic has two branches, and `subject` is free to
grow without any of it moving. A `CHECK` enforces the one impossible pair — `inquiry` admits only
`access`, because art. 14 is a right to _consult_ and nothing else.

`subject` is drawn from art. 15's own list — _"corrección, actualización o supresión"_, plus
_"presunto incumplimiento de cualquiera de los deberes contenidos en esta ley"_ — with `rectification`
covering _corrección_, _actualización_ and the _**adición**_ that `docs/research/moderation-record.md`
§2.4 derives from art. 4(d). `erasure` and `revocation` stay separate despite sharing an article,
because ADR-0007's revocation table gives them different effects, and because revoking a constitutive
Purpose is _routed_ to `erasure` — a transition the schema should be able to express.

`motive` is **required on every complaint**, in the Person's own words, enforced by a `CHECK`. Art.
15.2 requires the legend to carry _"el motivo del mismo"_, and a subject code is not a motive:
_"supresión"_ says nothing, _"están mostrando el nombre de mi antiguo empleador"_ is the actual
grievance and the only thing that lets an operator resolve it. There is deliberately **no pointer to
the contested Publication or Offer** — with the legend suppressing nothing (below), a scope column
buys nothing that the prose does not already say.

## The clock is frozen, and freezing is what makes the cure path lawful

| Term                                    | Value                                                                         | Counted                        | Source    |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ | --------- |
| Answer an `inquiry`                     | 10 días **hábiles**                                                           | **from** the date of receipt   | art. 14   |
| `inquiry` extension                     | +5 días hábiles                                                               | after the first term expires   | art. 14   |
| Resolve a `complaint`                   | 15 días **hábiles**                                                           | from the **day after** receipt | art. 15.3 |
| `complaint` extension                   | +8 días hábiles                                                               | after the first term expires   | art. 15.3 |
| Request cure of an incomplete complaint | 5 **días** — calendar, the only term in arts. 14–15 written without _hábiles_ | from receipt                   | art. 15.1 |
| Deemed _desistimiento_                  | 2 **meses**                                                                   | from the _requerimiento_       | art. 15.1 |

**`due_at` is nullable until the request is complete, then written exactly once and never
recomputed.** This resolves a real ambiguity rather than papering over it. Art. 15.3 counts from
_"su recibo"_ without saying whether that means the original filing or the completed one, and the
strict reading is absurd on its own terms: art. 15.1 gives the claimant **two months** to cure, which
would put the 15-día-hábil term months in the past before the reclamo is even readable. So the term
attaches to completeness — which is also exactly what art. 15.2 keys the legend to
(_"recibido el reclamo completo"_).

The consequence is a pleasing one: **`due_at IS NOT NULL` _is_ the record of completeness**, so the
legend needs no second column to derive from and there is no `is_complete` flag to fall out of sync.
Anything arriving through `/my-data` is complete by construction, so its `due_at` is set at insert.

Once set, a later fix to the calendar must never move it. The asymmetry runs in our favour: adding a
holiday only ever makes the true legal deadline _later_ than the one we froze and already
communicated, so a frozen date is conservative in the safe direction. `due_at` is the last instant of
the Nth business day in `America/Bogota` — unambiguous as a `timestamptz` because **Colombia has no
DST** (ADR-0008).

`received_at` is separate from `created_at` for the reason ADR-0008 anticipated: a request arriving
by email is typed in later than it arrived, and the legal clock runs from the arrival.

### The holidays are written down, not computed

The list of Colombian _festivos_ lives as **a plain constant in `@repo/consent`**, beside the clock
function, covering roughly a decade forward. Not a formula, not a package, not a table.

**Not a formula**, even though one exists — Easter computus plus the Ley 51 de 1983 (_Ley Emiliani_)
shift of eleven holidays to the following Monday. Congress adds holidays by statute, and did so ten
weeks before this decision: **Ley 2578 de 1 junio 2026** made 9 July a national holiday
(_Nuestra Señora del Rosario de Chiquinquirá_), itself movable, landing Monday 13 July in 2026 and
taking Colombia from 18 holidays to 19. A formula would have gone on silently returning the old
calendar. _(Press-sourced at the time of writing; confirm the primary text before the list ships.)_

**Not a package.** `colombian-holidays` is actively maintained and is a perfectly good way to
_generate_ the list once. Taking it as a runtime dependency is not, because then a lockfile bump
moves a statutory deadline, and we own that consequence either way.

**Not a table**, which is where an earlier draft of this decision overbuilt. Because `due_at` is
frozen at insert, the calendar is read exactly once per request, in code. Nothing ever joins it. A
seeded table with a content hash, a migration and a horizon invariant would be reference-data
machinery in service of an array. Git is the audit trail; a new holiday is a one-line diff in a
reviewed PR. The function **throws** if asked for a date beyond the last listed year, and one cheap
unit test keeps the list ahead of today.

This is deliberately relaxed rather than fully solved, and a follow-up issue tracks revisiting it.

## `reclamo en trámite` is derived, and it suppresses nothing

**The premise this ticket carried was wrong.** Both this ticket and
`docs/research/ley-1581-obligations.md` §4 and its checklist item 20 read art. 18(i) as forbidding
circulation of contested data. Verbatim:

> i) Abstenerse de circular información que esté siendo controvertida por el Titular **y cuyo bloqueo
> haya sido ordenado por la Superintendencia de Industria y Comercio**;

It is **conjunctive**, and it is a duty of the _Encargado_. Absent a SIC blocking order there is no
duty to halt anything. Art. 17, which lists the _Responsable_'s duties, has no equivalent at all —
its (l) requires only _"Informar al Encargado del Tratamiento cuando determinada información se
encuentra en discusión por parte del Titular"_.

**So the legend is a legend, not a suppression.** This matters more here than it would elsewhere:
suppressing a Person's Publications because they filed a rectification about their municipality would
take away the income surface this platform exists to provide, for up to 23 business days, on a
misreading of a statute that says the opposite. Nothing leaves the Walls, search or matching on a
complaint.

**The legend is derived, never stored.** A Person's data carries the legend exactly when a row exists
with `procedure = 'complaint' AND due_at IS NOT NULL AND resolved_at IS NULL`; the motive is the
`motive` column. `@repo/publications` (tier 4) already depends on `@repo/consent` (tier 3), so this is
a legal downward read in ADR-0006's DAG, and it follows the precedent ADR-0015 set when it derived
`frozen` from `persons.status` rather than storing a copy that drifts.

**The 2-día-hábil term is the argument for deriving.** Art. 15.2 gives us two business days to apply
the legend and requires it to persist until the complaint is decided. A stored flag needs a write to
set it and a write to clear it, either of which can be missed or lost on a restore — the exact hazard
this ticket flagged. A derivation applies in **zero** days, cannot be forgotten, and cannot survive
the decision that should have cleared it.

**The legend is never rendered publicly.** It appears in `/my-data` and in the operator surface, and
nowhere else. A _"reclamo en trámite"_ badge on a public profile would broadcast that someone
exercised a right, to strangers, on a platform whose users are already exposed — and with art. 18(i)
off the table it has no statutory customer to serve.

## Where it lives

**`@repo/consent`, tier 3, charter widened. Name unchanged.**

ADR-0006 rejected a "data rights" module on the ground that _"consent records must be readable from
low in the graph while export and erasure must reach across all of it. One module cannot be both
without a cycle."_ That reasoning is about **fulfilment**, not about the record. A `data_requests` row
references a Person and a clock and nothing else, so it sits perfectly well at tier 3; fulfilment
stays a use case in `apps/web` exactly as ADR-0006 designed.

Anywhere else creates an immediate cross-module write, because ADR-0007 already has this module
writing a `data_requests` row when a Person revokes a Purpose. **No new dependency edge is needed** —
an earlier draft put the holiday calendar in `@repo/catalog` and had `consent` depend on it, which the
constant removes.

Renaming the package to something that covers consents, disclosures, document versions _and_ the
rights clock was considered and declined: it is nearly free before any code exists, but it touches
ADR-0006, 0007, 0010 and 0011 for no behavioural gain.

```
data_requests
  id                     bigint identity, public_id uuidv7          -- ADR-0003
  person_id              → persons                                  -- anchor per #27, see below
  procedure              text NOT NULL  CHECK (IN ('inquiry','complaint'))
  subject                text NOT NULL  CHECK (IN ('access','rectification','erasure',
                                                   'revocation','duty_breach'))
                         CHECK (procedure <> 'inquiry' OR subject = 'access')
  motive                 text           CHECK (procedure <> 'complaint' OR motive IS NOT NULL)
  received_at            timestamptz NOT NULL                       -- not created_at
  due_at                 timestamptz                                -- null until complete; write-once
  cure_requested_at      timestamptz
  cured_at               timestamptz
  extension_notified_at  timestamptz
  extended_due_at        timestamptz
                         CHECK ((extended_due_at IS NULL) = (extension_notified_at IS NULL))
  resolved_at            timestamptz
  outcome                text           CHECK (IN ('answered','refused','desisted'))
  created_at, updated_at
```

**`data_requests` gets `updated_at`.** ADR-0008 groups it with `consents` and the contact-exchange log
as an _evidentiary_ table, and those are append-only — but this one is a case file that transitions,
and ADR-0008's own rule is that the absence of `updated_at` marks append-only. Stating the difference
rather than letting it be inferred.

**`transferred` is not an outcome.** Art. 15.1's _traslado_ — 2 días hábiles to hand a reclamo to
whoever is competent — has no application to us: we are the only Responsable of our own database and
there is nobody to transfer to. Recorded as considered and dropped, not overlooked.

## Who may ask, and how we know it is them

**One manual path, three populations, and no unauthenticated self-service form.**

| Who                           | How                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| Signed in                     | The session **is** the verification. `/my-data` answers instantly.  |
| Locked out                    | The published contact address; an operator creates the row by hand. |
| _Causahabiente_ / _apoderado_ | The same, with documents reviewed out of band.                      |

Arts. 14 and 15 both extend to _causahabientes_ by name, so the representative path is statutory
rather than a courtesy. An unauthenticated self-service form was rejected: _"delete the account for
X"_ from anyone is a doxxing and denial-of-service vector aimed at the one resource that cannot
scale, and D.1377 art. 13(1) already forces us to publish a contact address that requests will arrive
at regardless. Building a second channel that is strictly worse than the one we must have anyway is
not a service to anybody.

**This exposes a conflict with ADR-0009 and resolves it.** ADR-0009 accepted account lockout with
**no manual recovery desk**, on the honest ground that we cannot distinguish the locked-out person
from an attacker. That cannot extend here. `D.1074 art. 2.2.2.25.4.2` requires the rights channel to
be free and permanently available, and a locked-out Person holds every right they held yesterday. So:
**Ley 1581 forces a recovery desk to exist for rights, and only for rights.** It never returns
control of an account — it answers, corrects, and erases. ADR-0009's reasoning about sign-in is
untouched.

## `/my-data` is the inquiry, and the latency would have been the tell

This is where `docs/research/moderation-record.md` collides with ADR-0013, and the collision is real:
#31 settled that art. 8(a) **does** reach a Report written by another Titular (art. 3(c) defines
personal data by association, not authorship), that art. 14's _"toda la información"_ admits no
redaction regime anywhere in the título, and that the answer must therefore carry the reason code,
date, action taken, count, **and the substance of the allegation** with only the reporter's
identifying threads removed. ADR-0013 says _"the reported Person is never told a Report exists."_
Both cannot stand.

Redacting prose is judgement no code can make, so that part is operator-composed. But the naive
split — instant answers for clean accounts, _"we will respond within 10 días hábiles"_ for reported
ones — makes **the delay itself the disclosure**. Routing everyone through an operator to hide that
would mean nobody gets an instant answer, on the one surface the law wants frictionless.

**So `/my-data` shows every category, always, instantly** — safety records included, at reason-code /
date / action-taken grain. There is no latency asymmetry because there is no latency. The only
operator-composed artefact is the redacted prose, requested explicitly; and requesting it discloses
nothing, because the requester already read that the Report exists.

**Viewing writes no row. Exporting writes a closed `data_requests` row** with `subject = 'access'`,
mirroring ADR-0007's instantly-closed revocation row. An export is a discrete act producing an
artefact, and art. 14 requires the medium to be one _"siempre y cuando se pueda mantener prueba de
esta"_; a page view is not a _consulta_. Contents and format of the export belong to #27.

> **Amends ADR-0013 — "never told" narrows to "never notified".** We never push a Report at the
> reported Person, never notify, never badge. A Person who goes looking at `/my-data` finds it. This
> is not a preference: art. 14 has no exception and no balancing clause, and the alternative is a
> rights dashboard that lies by omission. The safety cost is real — a reported Person learns the
> codes and dates, which is a retaliation surface — and is named here rather than left implied.
>
> **Amends ADR-0013 — the reporter's _words_ are not withheld wholesale.** ADR-0013 withheld identity
> _and_ free text. #31 found that position the most exposed under arts. 11 and 14, with no redaction
> regime to rest on. It narrows to: **withhold the identity and any detail that fingerprints the
> reporter; disclose the substance.** The response must **name its own redaction** and cite the basis
> — **art. 13's closed recipient list, arts. 4(f) and 4(h), and art. 18(j)** — and _not_ arts.
> 4(g)/17(d), which govern securing the store rather than excepting a Titular's own access.
>
> **Amends ADR-0013 — `reports` gains room for the answer.** A nullable, capped text column holding
> the reported Person's response, written once by them, shown to the operator, and **never shown to
> the reporter** — the asymmetry ADR-0013 established, preserved. It is an _adición_ under art. 4(d),
> appended beside the reporter's words and never replacing them: C-748 fn. 212 records a tutela
> granted where negative data was held with no record of the subject's answering submission. This is
> only possible because the Person can now see the Report at all.

## The extension is the send

Both terms may be extended once, and only on notice — art. 14 and art. 15.3 both require informing
the Titular of _los motivos de la demora_ and _la fecha en que se atenderá_. An extension that moved
a date without sending anything would be unlawful and would look identical in the database.

So `extended_due_at` and `extension_notified_at` are written **in the same transaction as the outbox
row** that sends the notification, and a `CHECK` makes one null exactly when the other is. **You
cannot move the date without sending.** The outbox drainer is ADR-0015's, handed to #15.

Only one extension exists per procedure and it is capped by statute, so there is no extensions table
— two columns and a constraint. The cap itself (+5 hábiles, +8 hábiles) needs the calendar and so
cannot be a `CHECK`; it is enforced in code and guarded by an Invariant Test (ADR-0017).

## Missing our own deadline is what lets the Titular go to the SIC

Art. 16 makes exhausting our procedure a _requisito de procedibilidad_ — so our lapsed clock is
precisely the event that opens the SIC's door. That makes the alarm a compliance control, not an
operational nicety.

**A daily job lists open requests whose effective deadline falls within five business days and emails
the operator, and pings Healthchecks.io on every run** so that a job which stops running alarms too
(ADR-0005's single machine makes a silent cron failure entirely plausible). The dead-man's switch is
the load-bearing half: a deadline monitor that fails silently is worse than none, because it is
trusted.

**This ADR specifies what must alarm; #15 owns scheduling it.** Naming the split so it does not fall
between the two tickets.

## What this does not decide

- **The erasure anchor.** `data_requests` declares itself **retained as evidence** — required by
  ADR-0017's reflective erasure test, which makes every table referencing `persons` state its
  classification where it is defined. The bite is that an **erasure request is itself a
  `data_requests` row**, so a row dying with its Person would destroy the proof that we complied with
  the request to destroy it. But retention breaks a `NOT NULL` FK under ADR-0008's hard delete —
  the identical problem ADR-0008 already handed #27 for `consents`. **`data_requests` inherits
  whatever anchor #27 chooses for `consents`.** One mechanism for both, decided once; inventing a
  second here is how two evidentiary tables end up with two answers.
- **The enumerated refusal grounds and the `outcome = 'refused'` vocabulary** — #27, per #31.
- **Export contents and format** — #27.
- **Art. 18(h)'s second legend.** _"información en discusión judicial"_, inserted once a competent
  authority notifies us of judicial proceedings about data quality, is a real duty that reaches us
  through art. 18's _parágrafo_ and that nothing in this repo had noticed. It is **deferred, not
  missed**: unlike the complaint legend it cannot be derived, because no row in our database causes
  it; no judicial process can exist before launch; and adding it later is a stored flag plus an
  operator action. Written down so it is not rediscovered as a surprise.
- **The _manual interno_ (art. 17(k), and `2.2.2.25.2.8` making its documentation a duty in its own
  right).** A written procedure for handling _consultas_ and _reclamos_ is separately mandatory and
  currently homeless — #27 owns the retention schedule, #15 owns the runbook, neither owns this.
  **This ADR is its specification**; writing it into `docs/legal/` before launch is a task, and it
  must cover the manual identity path above, the redaction wording, and the alarm procedure.

## Consequences

- **`docs/research/ley-1581-obligations.md` is corrected** at §4 and checklist item 20: art. 18(i) is
  conjunctive and Encargado-facing, so no suppression duty attaches to a _reclamo_.
- **ADR-0006's `@repo/consent` charter widens** to the rights clock. No new edge, no new tier.
- **ADR-0007's "what this does not settle" shrinks** to the `/my-data` surface, export, erasure and
  retention — all #27.
- **ADR-0013 is amended three times**, above. #27 separately owns its Suspension amendment.
- **#27 inherits** the evidentiary anchor for `consents` _and_ `data_requests`, the refusal-ground
  vocabulary, and export contents.
- **#15 inherits** the deadline job and its Healthchecks.io ping.
- **The follow-up on the holiday list** is filed as a low-priority review issue rather than carried
  as fog: the decision is made and deliberately relaxed, not pending.
