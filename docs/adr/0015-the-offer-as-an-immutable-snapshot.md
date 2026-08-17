# The Offer: an immutable snapshot, answerable once

The Offer is the platform's only connective tissue. Everything else — the vocabulary, the search,
the Walls, the photograph — exists to bring two people to the moment where one proposes work to the
other, and the Offer is that moment. It is also the _last_ moment: no money moves, so the platform
stops at the introduction and cannot see what happens afterwards.

This ADR decides what an Offer carries, how it resolves, when Contact Details cross, and what the
platform refuses to know. It rejects the counter-offer, the notification feed, and the outcome
signal — three things that each look like an obvious feature and each turn the product into
something it deliberately is not.

The four-stage timeline in `NEXTJS_HANDOFF.md` (Postulación → Revisión → Entrevista → Resultado) is
**dead**, not adapted. It presupposes a vacancy and an application, and the pivot removed both.

## Both directions carry full terms

An Offer addresses a published Capability Profile or a published Need. The two arms are not
symmetric in feel — _"I'll pay you 80,000 a day to help in my kitchen"_ is obviously an offer, while
answering a Need looks like applying for something — but they are symmetric in **structure**: an
Offer always states its own complete terms, in both directions.

Where a Need exists, its terms prefill the form and the sender may edit them. That edit is how
someone says _"yes, but 90,000"_, and it is the reason the Need-facing arm is an Offer rather than a
**postulación**. `CONTEXT.md` bans that word, and without full terms the ban would be cosmetic: a
thin availability signal is an application whatever it is called.

Two consequences fall out. `Hirer` and `Worker` stay **derivable** from what the Offer addresses,
exactly as `CONTEXT.md` defines them, rather than needing a stored side. And the first number in the
conversation is often the **worker's** — which is the product's founding posture, not an accident.

A sender needs no Publication of their own. Signing in, searching by skill and sending an Offer is
the ordinary path, and a hirer with nothing published is the typical sender. ADR-0009's rule stands:
a verified email gates publishing and sending, not signing in.

## A snapshot, never a pointer

The Offer copies its terms rather than referencing the Publication's. A Need can be edited after an
Offer is sent against it, and a pointer would let that edit silently rewrite what somebody already
accepted.

ADR-0013's first recording requirement — _offer text stored verbatim and immutably_ — already forces
this for the prose. Extending it to every term costs a few columns and makes the accepted Offer a
self-contained record of what was agreed, which is the only record that exists. The link to the
Publication survives as **provenance**: how these two found each other, not where the terms live.

The Offer is **immutable once sent**. There is no edit. Changing anything means withdrawing and
sending a new one.

### The fields

| Field            | Required | Notes                                            |
| ---------------- | -------- | ------------------------------------------------ |
| What the work is | yes      | prose                                            |
| Work Setting     | yes      | fixed vocabulary — see below                     |
| Municipality     | yes      |                                                  |
| Commitment       | yes      | one-off or ongoing, with expected hours or dates |
| Start date       | no       | _"as soon as possible"_ is an honest answer      |
| Pay amount       | yes      | a single figure, COP                             |
| Pay basis        | yes      | per hour / day / week / month / job              |

**Work Setting moves.** `CONTEXT.md` made it a property of a Need, and ADR-0013 relies on it to
select the safety guidance shown at a Contact Exchange — but an Offer addressed to a Capability
Profile has **no Need behind it**, so on that arm the guidance had nothing to choose from. Neither
ADR had cause to notice; it appears only where the snapshot rule meets the safety rule. Work Setting
therefore belongs to the **Offer as well as the Need**, and it is the Offer's copy that the Contact
Exchange reads.

**Pay is mandatory, a single figure, and never a range.** _"A convenir"_ is the precise shape an
advance-fee or exploitation approach needs, and a range makes a yes-or-no answer dishonest — accept
it and you have accepted the top of it. Forcing a figure also forces the sender to think before
sending. Together with ADR-0013's fourth requirement — **pay direction fixed by the schema**, so an
Offer is structurally incapable of expressing _"the worker pays"_ — this is the anti-fraud control
that costs nothing.

**No Skills on the Offer.** Skills exist to make people findable. Concrete work is described in
prose. Putting Skills on the Offer gives them a second home with different semantics — willingness
on a Publication, requirement on an Offer — and invites someone to filter Offers by them later.

## The state machine

```
pending ──> accepted
        ──> declined
        ──> withdrawn
        ──> expired
        ──> voided
```

Five terminal states, every one reachable only from `pending`. Withdrawal is the sender's, and only
while pending — after acceptance the Contact Details have crossed and cannot be recalled.

**`frozen` is derived, not stored.** ADR-0011 handed this ticket the requirement that _frozen_ be
expressible in the Offer status vocabulary. It is expressible — but as a **read-time derivation**
from the recipient's `persons.status = paused`, not as a sixth stored value. A stored `frozen` is a
second copy of "is this Person paused" that can drift from the first, and it needs a sweep on pause
_and_ on unpause rather than one on return. **This amends ADR-0011's wording**, not its intent: a
Paused Person's Offers still present as a reviewable list rather than as live Offers.

**Silence resolves at 14 days.** A permanently pending Offer is a lie told to the sender. The clock
does not run while the recipient is Paused; on return, `expires_at` is pushed forward by the paused
duration in a single statement. A sender-chosen expiry was rejected — it invites _"expires in four
hours"_, a pressure tactic aimed at the person with the least power in the exchange.

## No counter-offer

Pay is the most likely reason to decline, and a hard no over 20,000 COP wastes a real match. The
obvious fix is a counter-offer. It is refused.

What ships instead: a **structured decline reason** (`pay_too_low`, `schedule`, `location`,
`not_available_now`, `not_interested`), shown to the sender, who may send **one revised Offer**.
That reaches the counter-offer's value through machinery that already exists — and it works in the
direction that always works, which matters, because A found B through B's Publication while B has no
guarantee that A published anything to address back.

An unbounded counter chain is chat with extra steps, and chat is the thing this mechanic exists
instead of.

**The reason is optional**, with a one-tap no-reason path given equal visual weight. Requiring a
justification before someone can escape an approach they find frightening is a safety failure, and it
would poison the reason data with whatever people pick to make the dialog close. The reason codes are
also the pattern data ADR-0013 deferred, so they are worth collecting honestly or not at all.

**The sender sees `declined` and `expired` as different outcomes.** Collapsing them to spare the
decliner makes silence the softer option and guarantees more of it.

### The per-pair limit is triggered by the answer, never by the activity

- **10 Offers per day** per sender.
- Per pair: **one revised Offer after a decline**. A second decline closes that pair for **90 days**
  — long enough to mean it, short enough that changed circumstances are not permanently locked out.
- A **Block** closes the pair permanently and silently.
- **Withdraw-then-resend counts only against the daily cap**, not the per-pair allowance. Nobody's
  _no_ is being overridden when the recipient never answered, and the common case is a typo in the
  amount, where the alternative is a wrong figure sitting in front of someone for 14 days.
- Every **refused send is recorded** — ADR-0013's second requirement. The refusals are the blast
  signal.

The global cap is the weaker control. Ten Offers a day still permits ten Offers to the same person;
the per-pair rule is the one that stops harassment.

## Identity before acceptance, Contact Details only at it

The recipient sees the sender's **name, Photo if shown, department, and a link to their Public View**
while the Offer is pending. Only Contact Details are gated.

Judging an Offer from an anonymous stranger is impossible, and ADR-0010 spent its entire argument on
a face being the only trust signal this platform has — concealing it exactly where trust is decided
would waste what that ADR paid for. The cost is that discrimination is possible at the decline. That
cost is already accepted on every other surface in the product.

**Contact Details cross exactly once, at acceptance, inside the transaction** that writes the
recipient's `disclose_contact` Consent — ADR-0007 already specified `acceptOffer` calling down into
`@repo/consent` within one transaction, and the sender's own scoped Consent was taken at send.

**`offers.accepted_at` is the contact-exchange log.** ADR-0006 assigned `@repo/offers` a
contact-disclosure log and ADR-0007 said its Consent rows sit alongside rather than replace it. Both
are **amended**: the Contact Exchange is 1:1 with acceptance, so a separate table would hold one
timestamp obliged to always equal another timestamp — a second source of truth about a single
instant. This satisfies ADR-0013's third recording requirement (_the Contact Exchange timestamp_)
directly.

**No Contact Details in any notification.** The acceptance email says the Offer was accepted and to
sign in; it never carries a phone number. Email is a channel we do not control, forwardable and
retained indefinitely, and putting Contact Details in one moves the disclosure outside every log and
Consent record ADR-0007 exists to produce.

## Nothing after acceptance

The platform records nothing about what happens next. No follow-up, no outcome, no confirmation that
work occurred or that anyone was paid.

This is v1's central limitation and the copy must state it rather than let the interface imply
otherwise. With no money moving, the platform **cannot** verify payment — an unverifiable
self-reported outcome shown as a trust signal is worse than no signal, because it is gameable by
precisely the person it would exist to catch, and it lends the platform's authority to a claim the
platform never checked.

**This is a v1 decision with a named successor.** Asking both sides whether the deal came off is
intended for a later release. It needs no change to `offers` — a separate table, written after the
fact — but it is not a small feature, and the map's fog already says why: the moment reputation
accrues, re-registration stops being cheap and **ADR-0009 must be reopened**. That ADR accepted
account lockout with no manual recovery desk _only_ while a profile is knowledge rather than
accumulated capital. The successor decision owns that, and this ADR does not pre-empt it.

## Three interruptions

**A Block leaves the Offer pending.** When the recipient blocks the sender, the Offer disappears from
the recipient's view, stays `pending` for the sender, and expires on its normal clock. Anything
faster leaks the Block, which `CONTEXT.md` says is never disclosed. The sender waiting 14 days for an
answer that will not come is the price of that silence, and it is worth paying.

**A Suspension voids Offers in both directions.** ADR-0013 voided the Offers a suspended Person
_sent_; its reasoning — an Offer pending against an account that will never answer strands the
recipient — applies identically to Offers sent _to_ them. The counterparty sees a neutral _no longer
available_, never that a moderation action occurred.

**Unpublishing does not touch a pending Offer.** The Offer is a snapshot; unpublishing means _stop
new Offers_, not _decline the ones that already arrived_. Same distinction ADR-0011 drew when it
froze rather than declined a Paused Person's Offers.

## No notification system

Every notification in v1 is about an Offer, and the Offer row already carries the state a
notification would announce. A `notifications` table would be a denormalised copy able to disagree
with the thing it describes.

What exists instead is the **Offers surface** — _Propuestas recibidas_ / _Propuestas enviadas_ —
reading status straight off `offers`, plus email. A notification system earns its place when events
stop being 1:1 with a domain row (a Report resolved, a Photo approved, a Skill Suggestion answered),
and that is a decision to make with real events in hand.

> **Tested by ADR-0027 and the condition is not met.** A Photo approved or refused is exactly 1:1
> with the Photo row, which already carries the state a notification would announce — so a
> `notifications` table would be the denormalised copy this section rejects. What that ADR needs is
> the outbox below, unchanged. One event off this list; a Skill Suggestion answered is still open.

This adds **`seen_at`** to the Offer, for the recipient's own unread count, with a hard rule:
**`seen_at` is never shown to the sender.** No read receipts. _"Seen three days ago, no answer"_ is a
pressure tactic aimed at the person with the least power in the exchange, and it tells a harasser
they got through.

**Accepting an Offer touches no other pending Offer.** Nothing auto-declines. The platform cannot
know whether these are exclusive — someone may well take three cleaning jobs a week — and declining
on someone's behalf is what ADR-0011 already refused to do.

## Refused sends are not Offers

A send refused by a rate limit never became an Offer, and does not become one with a `refused`
status. It is an append-only **Offer Send Attempt**: sender, intended recipient, timestamp, refusal
reason — an evidentiary table in ADR-0008's sense, `created_at` and no `updated_at`.

It stores **no body**. The prose reached nobody, and no _finalidad_ justifies retaining it. Sender,
target and time is the whole blast signal ADR-0013 asked for.

Keeping refusals out of `offers` keeps the state machine's five terminal states meaning what they
say, and keeps `offers` a table of things that actually happened between two people.

## Notifications must survive a rollback

Notifying on **received**, **accepted**, **declined**, **withdrawn** and **expired** puts a side
effect next to a transaction. Sending inside it means a rollback undoes the row but not the email;
sending after it means a crash loses the send.

Each notification is an **outbox row written inside the transaction** and drained after commit. This
ADR fixes the requirement and the row. **Who drains it belongs to #15** — it is a deployment
question, and ADR-0005's single long-lived Fly server answers it differently from anything with more
than one machine.

This graduates the map's _"side effects that must not roll back"_ fog, which named #9 and #15 and
left it to whichever settled first.

## Consequences

- **ADR-0011 amended**: _frozen_ is derived from `persons.status`, not a stored Offer status.
- **ADR-0006 and ADR-0007 amended**: the contact-exchange log collapses into `offers.accepted_at`;
  there is no separate table.
- **`CONTEXT.md`**: **Offer** rewritten with its five terminal states; **Work Setting** now belongs to
  the Offer as well as the Need; **Offer Send Attempt** added.
- **#15 inherits** the outbox drainer, alongside the rate limiter ADR-0009 handed it.
- **#12 inherits** a copy obligation: v1 cannot verify that anyone was paid, and no surface may imply
  it can.
- **The successor to this ADR** — outcome confirmation — reopens ADR-0009 when it lands.
