# A Need is composed on one screen, and `Commitment` says whether the work ends

Two fields print on the public Need card and are collected by **nothing**. `Work Setting` was half
fixed by ADR-0030, which put its control on ADR-0025's _dónde_ screen because its own disclosure rule
could not run without it — and said plainly that it had covered the first run only. `Commitment` was
not fixed at all: `CONTEXT.md` sketches it as _"one-off or ongoing, with expected hours or dates"_,
which is a description rather than a vocabulary, and ADR-0015 makes it **required on an Offer** under
the same sketch.

Behind both sits a surface nobody has described. ADR-0025 publishes exactly one Publication and owns
nothing after it, while ADR-0002 lets a Person publish **0..n** Needs. The second Need has been
composed nowhere since the domain model was written.

This ADR closes the vocabulary, the surface and editing together, because each of the three was
answering a question the other two had already half decided.

## `Commitment` is a duration class, and the hours are missing on purpose

Three values, and they are the whole of it on a Need:

| Value       | UI                 |
| ----------- | ------------------ |
| `one_off`   | _una vez_          |
| `temporary` | _por un tiempo_    |
| `ongoing`   | _sin fecha de fin_ |

**The sketch's second half — _"with expected hours or dates"_ — is removed rather than implemented.**
ADR-0025 threw pay and conditions off the Need on an argument that reaches this field exactly:

> a Need quoting a rate and a schedule is a _vacante_ in everything but name

which is the object UAESPE **Res. 000129 art. 5** reaches, and the exposure ADR-0011 accepted
knowingly and narrowly. Pay left through the front door; hours and dates would walk back in through
this one. A `Commitment` carrying _"20 horas semanales, del 3 de marzo al 30 de junio"_ is a schedule,
and a public card carrying a schedule is the thing the whole of ADR-0025's copy rule exists to keep the
Need from becoming.

What survives is the question a worker is actually asking, which is not _how many hours_ but **does
this end**. A day's work and a permanent post are different decisions about whether to answer, and
they are different in a way that survives having no numbers attached.

**Frequency is deliberately not collected.** _Every Saturday_ versus _full-time_ is hours by another
name, arriving as a second enum instead of a number. Where it matters it belongs to the Offer, which
is where ADR-0025 already sent _"el pago y las condiciones"_, and to the Self-description, which is
what a worker reads before deciding whether to answer at all.

**Two values were rejected** — collapsing _por un tiempo_ into _sin fecha de fin_ loses the
distinction that matters most to someone deciding whether to give up other work for this.
**Four were rejected** because the fourth is always a schedule wearing a category's clothes.

## The Offer's `Commitment` is the same word doing a second job

ADR-0015 requires it and means the precise reading — an Offer is answerable exactly once, and you
cannot honestly say yes to a vague thing. That is a real difference from the Need, and it is a
difference in **exposure**: the Offer is a private, immutable snapshot between two people who have
already found each other, and the Need is a card on a surface with no session gate.

So the Offer carries the same three values **plus an optional end date, and nothing else**.

On re-reading ADR-0015's field table, most of the precision its sketch asked for **already exists
there**: `Pay basis` is per hour / day / week / month / job, which encodes the shape of the work, and
`Start date` is already a column. The only thing genuinely absent is when the work **ends**, which is
what makes `temporary` answerable rather than decorative. **No hours column** — `Pay basis` already
carries that, and a second field about the same quantity is a second source of truth that can
disagree with the first inside one immutable record.

**One word now covers two shapes, and `CONTEXT.md` says so explicitly.** That is stated rather than
left to be noticed, because this is the second time it has happened: ADR-0015 discovered that
`Work Setting` had quietly moved from the Need to the Offer, and only noticed because the snapshot
rule met the safety rule in one place. A vocabulary that means slightly different things on two
objects is fine; a vocabulary that does so silently is what produced that repair.

## `Commitment` is shown and never queried

It is a closed vocabulary on a public card, which makes it look exactly like a filter axis. It is not
one, on three grounds, and the first is the one that decides it:

**A worker filtering to `ongoing` filters out the fastest money available to them.** The audience is
people who lost their income within the last few weeks. One-off work pays this month; a filter that
hides it is a control that hurts the person operating it, offered by a product whose whole argument is
that it does not know better than the person using it.

**A hirer filtering on it narrows the side ADR-0016 already found empty.** The worker-facing corpus is
the scarce one; adding an axis that shrinks a result set is a feature aimed at the abundant side.

**And ADR-0014's query stays literally unchanged**, which matters more than consistency for its own
sake — ADR-0030 leaned on that query being **uniform for every Need** when it argued that a card
withholding the Municipality was a fig leaf, because the band membership disclosed it anyway. A new
filter axis is a new way to read a value off the result set, and it would need that argument re-run.

The rule is therefore the Self-description's rule, applied to a field that happens to be an enum:
**shown, never queried, never an input to matching.**

## The second Need is composed on one screen

One screen, every field on it, one **_Publicar_** button.

ADR-0025's four-screen pacing is bought for a **stranger** — someone who has never seen the product,
one question at a time, a breadcrumb so they know it ends. There is no stranger here. A Person
publishing a second Need has already met the picker, the _dónde_ screen and the ending that tells them
what publishing does and does not do.

**The cheaper choice is also the kinder one**, and for the constraint this map keeps naming: a person
rationing mobile data loads one page instead of four, and has no partial progress to lose between
them. ADR-0025 built _"Guardar y seguir después"_ precisely because the flow could be abandoned
halfway; a single screen has less halfway to be abandoned in.

**This covers the first Need through the other door too.** ADR-0025's fork tells a worker _"la otra
queda para cuando quieras"_, so a Person who came through the _Busco trabajo_ door and later publishes
their first Need is composing a Need for the first time while not being new to the product. Newness to
the **product** is what the flow buys, and they do not have it.

What arrives on the screen unchanged:

- **ADR-0023's picker**, capped at **5** for a Need (ADR-0016), with its meter, its cap treatment and
  its Skill Suggestion.
- **The Municipality, the remote flag and the Work Setting**, as ADR-0030 grouped them.
- **`Commitment`**, as a radio group.
- **The Self-description**, which is the field a worker reads before answering.

And the copy, which is the part that must not be lost:

- ADR-0025's **_"El pago y las condiciones no van aquí: los pones en la oferta que le mandas a
  alguien."_**
- ADR-0030's two `hirer_home` conditional lines — the one about the author's name on the public card,
  and the one about not typing an address into the prose.

**Teaching copy is not pacing.** The distinction is load-bearing: when the scaffolding of a guided
flow is removed, the sentences carrying a regulatory edge are exactly the ones most easily removed
along with it, because they look like onboarding. They are not. They ride as inline notes on the
fields they belong to.

## Editing is the same screen prefilled, and it is safe because the Offer copies

One component, two entry points. A Need is an **advertisement**, not an agreement, and editing one is
ordinary — which is worth saying out loud only because ADR-0015 makes the neighbouring object
immutable for reasons that do not transfer.

**Editing is safe precisely because of the decision that made the Offer immutable.** ADR-0015 has the
Offer **copy** its terms rather than point at them, on the ground that _"editing a Need cannot rewrite
what someone already accepted"_. That property was argued for the Offer's benefit; it is what makes an
editable Need harmless, and nothing further is needed to protect an accepted Offer from an edit.

**The `hirer_home` flip needs no machinery.** Changing the Work Setting to or from `hirer_home` flips
whether the public card names the author — but ADR-0030 already requires that branch to live in the
**read-time projection** (_"the branch lives in the projection"_), and its Invariant Test assumes it.
So the card simply renders differently on the next read. The screen shows the same conditional
sentence at the moment the setting changes that the compose screen shows when it is first chosen; the
consequence is disclosed where the choice is made, which is ADR-0025's pattern and ADR-0030's
requirement.

**Unpublish and republish live here.** `publications.status` already carries
`draft | published | unpublished` (ADR-0008), and a per-Need control is the thing ADR-0011's Pause
explicitly is **not** — it warned that Needs _"should not unpublish four things one at a time"_, which
is an argument for a Person-level Pause existing, never an argument against a Need-level control.
They answer different questions: _I am not available at all_ versus _this particular job is filled_.

**No delete.** ADR-0008 hard-deletes and defaults FKs to `RESTRICT`, so a Need with Offers against it
cannot be deleted without either a cascade that destroys an Offer's provenance or an error the person
cannot act on. Unpublish is the honest mechanism, it is already built, and a second one buys nothing.

## The Capability Profile gets the same screen

The same hole exists one object over: the Capability Profile is composed in the first run and edited
**nowhere**. Closing it costs a paragraph, and leaving it open is the identical bug.

Same one-screen pattern, prefilled, picker capped at **20** rather than 5 (ADR-0012). It differs in
one way that matters: it carries the **Photo** control, so **ADR-0025's three structural constraints
arrive whole** — never the last control before the button that saves, two controls of equal visual
weight, and the stated cost of skipping being nothing. ADR-0025 declared those properties of _any_
screen that offers the Photo rather than of its flow, so this inherits them and reopens none of them.

D.1377 art. 6's ban on conditioning is broken by a running order as easily as by a rule, and on a
single screen "running order" means visual order. The constraint is not weaker here for being on one
screen; it is only expressed in a different axis.

## A cap on published Needs is a footprint, not a rate

`CONTEXT.md` says 0..n and means it literally. **Nothing anywhere bounds it.** ADR-0013's three
durable counters guard Offers sent per day, distinct recipients per rolling week, and Reports per
reporter per day — every one of them **per unit of time**, because every one of them guards a blast
pattern. Publishing is unguarded, and a Need is public prose on a surface with no session gate.

The bound is on **published Needs held at once**, and it is generous — well above any honest use.
Unpublish one to publish another.

**It must not be wired into ADR-0013's counter mechanism**, and that is the substance of this section
rather than the number. A standing footprint and a rate are different shapes: a rate needs a window
and a durable count over `created_at`, a footprint is `count(*) where status = 'published'` evaluated
at the moment of publishing. Sharing a mechanism between them would give the safety counters a member
that is not a safety counter, and ADR-0013 was explicit that its counters exist so the patterns it
deferred stay answerable by SQL later.

ADR-0013 already set the rule this follows: auth limiting and safety counters **_"share a name and
share nothing else"_**. ADR-0032 extends that to a third case — an unattributable public surface at
the edge — and keeps all three apart. This is a **fourth** thing again, and the only one of the four
that is not a rate at all.

**The number is not enshrined here, and unlike ADR-0012's skill cap it is symmetric.** That is worth
defending rather than asserting, because ADR-0012's asymmetry argument looks like it should transfer
and does not: there, lowering the cap means **telling people who have already published to delete
skills**, because the cap is checked wherever a Publication is written. Here the check runs at
**publish time only** — `count(*) where status = 'published'` against the cap, at the moment of
publishing. A Person holding more than a newly-lowered cap is a legal state that demands nothing of
them; they simply cannot add another until they unpublish one. Lowering costs a config value and no
conversation, so ADR-0014's precedent of deliberately not fixing such a number applies and ADR-0012's
does not.

## `commitments` is a column, not a table

ADR-0006 lists a plural `commitments` table in `@repo/publications`. With one value per Need there are
no rows for it to hold: `Commitment` is `text({ enum })` plus a `check()` per ADR-0008's
no-`pgEnum` rule, on `needs` and again on `offers` — the second copy because ADR-0015 copies rather
than points.

ADR-0006's list was derived at tier-assignment time, before anything about `Commitment` was known, and
it is corrected rather than honoured. **A table nobody removes is a table somebody eventually fills**,
and the shape it would invite — many Commitments per Need — is the schedule this ADR just refused,
arriving through the schema instead of through the UI.

## Consequences

- **ADR-0006 corrected.** `commitments` leaves `@repo/publications`' table list; the column lives on
  `needs`, and a second on `offers`. No tier changes and no dependency edge moves.
- **ADR-0015 amended.** Its `Commitment` row gains a definition instead of a sketch, and the Offer
  gains an **optional end date**. Its immutability, its copy-not-point rule and its field table are
  otherwise untouched — and the copy-not-point rule is what makes an editable Need safe.
- **ADR-0025 amended.** The Need arm's _descripción_ screen gains the `Commitment` control. **The
  Need arm is still four screens** — the count ADR-0030 also preserved. Its Photo constraints are
  inherited by the Capability Profile screen below, as it required.
- **ADR-0014 and ADR-0026 discharged.** The public Need card's `Commitment` is now collected, so it no
  longer renders blank — which ADR-0026's no-placeholder reasoning would otherwise have reached.
  ADR-0014's query definition, bands and explanation sentence are **unchanged**.
- **ADR-0030's open note is discharged.** _"`Commitment` is the same gap and is not closed here …
  left to whoever owns Need composition beyond the first run — which is also unowned"_ — both halves
  are owned by this ADR.
- **ADR-0011 extended.** A per-Need unpublish control exists and is not Pause; Pause stays the
  Person-level state it defined.
- **ADR-0013 extended, and deliberately not amended.** The published-Need cap is named as **not** one
  of its counters, so nobody wires one mechanism for both — the same separation it insisted on
  between safety counters and the auth limiter.
- **ADR-0017 gains one testable thing and no more.** The cap is enforced in a use case, which is a
  seam; everything else here is a screen, a string or an ordering, which ADR-0017 tests in neither
  seam. ADR-0030's projection Invariant Test already covers the `hirer_home` branch and needs no
  companion.
- **`CONTEXT.md`** — **Commitment** rewritten with its three values and the explicit note that the
  Offer's copy carries an end date the Need's does not; **Need** gains that the number a Person may
  have published at once is bounded.

## What has no automated guard

The one screen's copy — ADR-0025's _pago y condiciones_ line and ADR-0030's two `hirer_home`
sentences — and the visual ordering that keeps the Photo control off the save button on the Capability
Profile screen. Both are properties of a React component tree, which ADR-0017 puts outside its two
seams.

This adds the compose-and-edit surfaces to the list the map already carries: the consent-evidence
path, ADR-0023's picker, ADR-0025's first run and ADR-0031's operator surface. The item with a
regulatory edge is the same one ADR-0025 named — a refactor that moves one element publishes people
through a control the law says may not condition anything — and it now exists in two places rather
than one.

## Rejected

**Hours and dates on the Need.** The sketch in `CONTEXT.md` said so, and it is a schedule; ADR-0025
kept pay and conditions off the Need for exactly the reason that reaches it.

**A frequency value beside the duration class.** _Every Saturday_ is hours expressed as a category.

**`Commitment` as a search filter.** Argued above: it hurts the person operating it, narrows the
scarce side, and reopens the uniformity ADR-0030 relied on.

**Re-running the first-run flow for the second Need.** Pacing bought for a stranger, charged to
someone who is not one, and paid in page loads by a person rationing data.

**A separate edit flow.** Two surfaces asking the same questions drift, and the teaching copy would
survive on only one of them.

**Deleting a Need.** `RESTRICT` plus an Offer's provenance; unpublish already exists and is honest.

**Wiring the cap into ADR-0013's counters.** A footprint is not a rate, and the counters exist to keep
a deferred question answerable in SQL.

**Coarsening the Offer's `Commitment` to match the Need's.** Symmetry for its own sake, against
ADR-0015's requirement that an Offer be answerable once. The exposure differs, so the field may.
