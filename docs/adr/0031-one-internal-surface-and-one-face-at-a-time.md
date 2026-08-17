# There is one internal surface, and a Photo is judged one face at a time

ADR-0010 pre-moderates every Photo — nothing is visible to anyone but its owner until an operator
approves it — which makes a review surface a **launch requirement** rather than tooling. Without one
the feature does not function at all. ADR-0027 then authored the refusal vocabulary copy-first and
handed this ticket _"a finished vocabulary and a queue with two exits"_, keeping for itself only how
an operator picks a code, the queue order, the access log and the three-day alert.

Prototyped at `docs/design/photo-review-prototype/` on `prototype/photo-review-queue`: two ways of
judging one photograph, inside the shell decided below.

## Four lists, one surface

ADR-0013 already refused to let this be a photo tool: the safety queue is _"another list inside the
operator surface #28 builds, sharing its authentication, layout and operator access log"_, and it
counted three — Photo Review, Reports, and ADR-0012's Skill Suggestions — on the ground that **a solo
developer maintaining three internal applications maintains none of them.**

That argument does not stop at three. **There are four**, and the fourth is `data_requests`.

ADR-0020 assumed this surface without naming it: the _reclamo en trámite_ legend _"appears in
`/my-data` and in the operator surface"_, a locked-out Person or a _causahabiente_ arrives at the
published contact address where _"an operator creates the row by hand"_, and ADR-0028's daily monitor
emails the operator against a statutory clock. Every piece of that is decided and none of it has a
screen.

It is also the one list where being missed is a **regulatory event** rather than a slow day: art. 16
makes exhausting our procedure a _requisito de procedibilidad_, so a lapsed clock is precisely what
opens the SIC's door. That is an argument for putting it where the operator already looks, not for
giving it its own application.

**Navigation is a sidebar with four links, each carrying a count**, exact to 99 and then `99+`. The
count is a `SELECT count(*)`, never a cached number — ADR-0013 settled that shape for safety counters
and the reason carries: _"a Redis counter is a second source of truth that drifts and cannot be
audited."_ ADR-0016's refusal of Redis on safety grounds points the same way.

The Photo list carries **the age of its oldest item** beside the count, and that is not decoration:
ADR-0010's commitment is about age. Three photographs four days old is the alarm; sixty an hour old
is not.

## Getting in

**A `role` on `users`, a second factor, and a separate door.**

Better Auth's `admin` plugin supplies the role and the access-control statement. Two roles, `user`
and `operator` — **not `admin`**, because every ADR in this repository and `CONTEXT.md` already say
_operator_, and ADR-0001 asks identifiers to mean what the domain means. `defaultRole: "user"`,
`adminRoles: ["operator"]`, and the statement's resources are the four lists, so a later split —
reads photographs but not Reports — is configuration rather than a migration.

**Every `/operator/*` route checks the role on the server.** That check is the boundary. The
sign-in page at `/operator/login` is a real thing to build but it is not the boundary: Better Auth is
one instance issuing one session, so a second route buys presentation, not security. It is worth
building anyway because it keeps the operator out of ADR-0007's four consent boxes and ADR-0025's
Person-shaped first run on the way in. It carries `noindex`, no signup link and no social buttons.
**ADR-0022 makes staging public**, so the server-side check is the only thing standing there.

### 2FA for operators, and ADR-0009 survives intact

ADR-0009 declined 2FA in one sentence: _"It adds a second thing to lose to an audience already at
risk of lockout, and it needs a delivery channel this ADR has just declined to pay for."_

**Both halves of that reason are about Persons, and neither reaches an operator.** A TOTP
authenticator app has no delivery channel at all — the channel is what made phone OTP cost $50.87
against #18's $4.46–$7.46 remainder — and the operator is not an audience at risk of lockout with
nowhere to turn, because the operator is the desk. So the amendment is narrow: **2FA is required for
`operator` and unavailable to everybody else.** ADR-0009's reasoning about Persons is untouched.

One inherited constraint, from the plugin rather than from us: **2FA enables only on credential
accounts.** The operator therefore signs in with **email and password**, never Google or Facebook,
which narrows ADR-0009's three credential types to one for this account alone.

### Operator lockout is a compliance failure mode

The `twoFactor` table carries `failedVerificationCount` and `lockedUntil`. ADR-0020 makes the
operator the **only rights desk** — _"Ley 1581 forces a recovery desk to exist for rights, and only
for rights"_ — and ADR-0028's deadline monitor emails that same operator. An operator who loses their
phone stops the photo queue, the safety queue **and** the art. 15 clock, with nobody to appeal to.

**Backup codes are generated at enrolment and stored off-platform beside ADR-0021's `subject_key`
HMAC**, which is already an irreplaceable secret the map's backup-and-recovery patch owns. One place,
one procedure, in `docs/runbook.md`. Naming it here so it is not discovered on the day it matters.

### Two plugin features we take and never use

The `admin` plugin's **ban feature cannot be disabled or omitted**, so `users` gains `banned`,
`banReason` and **`banExpires`** whether we want them or not.

ADR-0013 forbids exactly what they do: _"Suspension is indefinite and operator-reversible, **never
timed**. A timed ban implies a rehabilitation process that nobody is staffed to run, and an expiry
date is a promise the platform would keep automatically without anyone having looked."_ Suspension
lives on `persons.status`, owned by `@repo/people`, set by a `@repo/safety` use case, and that does
not change.

**So the columns exist as dead weight, the endpoints are never called, and an Invariant Test guards
it.** ADR-0017 built that mechanism for this case precisely — a test guarding a decision rather than
a feature, named for its ADR, with `grep` as the index. Without it the next reader finds a working
ban API in the schema and uses it, and the schema is the last place a prohibition can be read.

**Impersonation is disabled**, and this is the sharper of the two. The plugin adds `impersonatedBy`
to sessions; an admin browsing as a Person would see that Person's pending Photo **through the
ordinary product surface**, where the access log below does not run. It would also walk straight
through ADR-0011's visibility design. A control that another ADR built is not allowed to have a
silent bypass, so the feature is off and the ADR says why.

## Photo Review: three states, one order

**`pending` → `approved` | `refused`**, under ADR-0008's `text({ enum })` + `check()` rule, and
**no claim state**: with one operator a claim is a lock against nobody.

A review is **its own append-only row**, not a mutable status on the Photo. That is what makes it the
evidentiary row ADR-0010 requires — _"person, reason code, timestamp"_ surviving the destroyed image —
and it means **a re-upload is a new Photo with a new review**, rather than a state machine that
loops. ADR-0010 made re-upload the appeal; this is that decision in a table.

**Order is strictly oldest-first, with no operator-selectable sort.** ADR-0013 gives the _safety_
queue a priority rule (`hirer_home`, `underage`) and it earns it with a harm argument. No candidate
priority here has one, and every candidate sorts **people** rather than photographs — which is the
failure ADR-0010 rule 1 and ADR-0026 both exist to prevent. Under oldest-first the age of the head of
the queue already **is** the sort key, so displaying it asserts nothing the order does not.

## One face at a time

**The operator judges one photograph at a time.** The contact sheet was built rather than argued
about, and it loses on three counts.

It puts a dozen strangers' faces on one screen, deepening the residual ADR-0010 accepted and this ADR
declines to mitigate. Its obvious next feature is a checkbox and an _approve selected_ button, which
is what ADR-0010 refuses outright: **a person's standing on this platform never changes without a
human having looked** — the same sentence ADR-0013 reused to refuse accumulation-triggered action. And
it is the only variant where the access log stops matching the decision: one screen, twelve faces,
twelve rows, one glance.

The speed argument is real and is not dismissed. It loses because the queue is small by construction
— most Persons upload once (ADR-0010's own reason for accepting a queue at all) — so the throughput a
sheet buys is throughput we do not need, paid for in the one currency this surface is expensive in.

**The photograph is set inside a mount**: a photo-proportioned frame with a mat inset. ADR-0027 fixed
that shape for the refusal notice, where it holds the space the photograph is not. Here it is full.
It is the same rectangle on both sides of the same event, and using it twice is the point.

## The operator picks a sentence, not a code

The surface is **Spanish**, like every surface a person reads (ADR-0001). Identifiers stay English —
`pending`, `face_not_visible`, `shortlisted` — which is ADR-0001's actual line, sharpened by #30:
Spanish chrome grows Spanish state keys, and that is the two-language codebase the ADR exists to
prevent.

That matters more here than on an ordinary internal screen. **The six refusal options render as the
Spanish sentences the person will receive**, at reading size, in the body face, with the identifier
set small beside them. ADR-0027 authored that vocabulary copy-first for one reason: a list written for
an operator's queue — `INVALID`, `POLICY_VIOLATION`, `LOW_QUALITY` — _"translates into exactly the
sentence this ADR exists to avoid, and by the time it is being translated the translation is the only
lever left."_ **A picker that displays codes reintroduces the operator-convenience list through the
back door**, on the one screen where the decision is actually made. The operator is choosing a
sentence about a person's face and the interface should not let that feel like anything else.

Selecting a code also shows **the imperative** — the half that travels by email. `not_for_work` and
`face_not_visible` share one imperative word for word, and the surface says so rather than leaving it
to look like a copy-paste error, because that collapse is the control that stops the email being read
backwards to the code.

**There is no free-text field**, per ADR-0010.

## The two exits, and a Report with no reporter

ADR-0027 fixed the shape: **the photo queue judges photos and the safety queue judges accounts.**
Where no image-level code is true, the Photo is approved and any doubt about the person is an
ADR-0013 matter. `impersonation` and `underage` are Report codes and were deliberately kept out of the
photo vocabulary.

**A Report has a reporter, and this one has none.** ADR-0013 roots a Report on a Person, written by a
signed-in Person; an operator raising a matter about an account is not that.

**`reports.reporter_person_id` becomes nullable, and a null reporter means the platform raised it.**
No synthetic operator Person — a fabricated Titular in a table of real ones would corrupt every
count, every art. 8(a) answer and every erasure adapter that walks it.

**An operator-raised Report carries a code and never free text.** ADR-0013 permits reporter prose on
an explicit asymmetry — _"an operator writing prose about a face is **us** creating a record about
someone, while a reporter describing what happened to them **is** the complaint"_ — and an
operator-raised Report is entirely the first case. The asymmetry decides it without a new argument.

## What the log records

ADR-0011 killed the general profile-view log it was going to feed, so ADR-0010's operator access log
**owns itself** and lands here.

**The logged act is the issuance of the signed URL.** ADR-0010 serves bytes by time-limited GET and
never from a public bucket, so that issuance is the only moment a face actually reaches an operator's
screen. Logging there is automatic; logging in the interface depends on whoever writes the component
remembering to. It also gives ADR-0010's own grain — _"one row per review rather than one per page
view"_ — for free under the one-at-a-time decision.

**Rendering a list writes nothing**, because a list that shows no photograph discloses no face.
Logging it would inflate the record and weaken what the record means.

The surface **tells the operator this is happening** rather than only recording it. The residual is
that the operator sees every face on the platform; the log is the whole mitigation, and a mitigation
nobody is shown is a claim rather than a control.

## Three days

ADR-0010 displays _menos de 3 días_, backs it with an alert, and forbids any automatic transition. So
this is an alarm and a piece of copy, never a state machine.

**A daily trigger.dev schedule, pinned to `America/Bogota`, emailing the operator through ADR-0015's
outbox and pinging Healthchecks.io** — the shape ADR-0028 established for ADR-0020's deadline monitor,
reused rather than reinvented. It is the sixth schedule.

**No SMS and no Pushover.** ADR-0028 reserves the escalating channel for a dead man's switch, on a
rule worth not eroding: _a dead man's switch may not share a failure mode with the alarm it guards._ A
photo backlog is not a compliance deadline, and #6 priced SMS to +57 out of the budget anyway.

Queue age is surfaced **in the list**, as the oldest item's age. The pending card shown to the Person
is ADR-0027's, unchanged.

## Neither record survives its subject

`photo_reviews` and the operator access log are new tables referencing `persons`, so ADR-0017 forces
each to declare an **erasure classification** where it is defined and ADR-0021 joins **a retention
term** to the same declaration. The reflective invariant fails on a table that has not.

**Both are `with Person`, both 12 months.**

ADR-0021 has already run this argument once and reached this answer. It declined the ban blocklist
because _"a retained coded fraud reason about someone who asked to be forgotten is plausibly `dato
sensible`"_ under art. 5's open list. **A retained refusal code about somebody's face is that argument
at full strength** — `face_not_visible` is a proposition about a person's appearance, and the object it
describes is a _dato biométrico_ ADR-0010 treats as sensitive throughout. Keeping either row past the
erasure would mean the platform remembers something about the body of a person who asked to be
forgotten.

The access log has no independent customer to keep it for. ADR-0011 rested it on arts. 4(g)/17(d), and
ADR-0020 later found those _"secure the store rather than except a Titular's access"_; its real basis is
**art. 8(c), the Titular's right to know who accessed their data** — and after an erasure there is no
Titular to exercise it.

Twelve months matches `offer_send_attempts`, the existing table for an attempt that led nowhere.

**The cost, named:** after an erasure we cannot show a regulator who viewed that face. That is the same
trade ADR-0021 accepted for the ban record, taken again for consistency rather than rediscovered.

## Skill Suggestions, and the end of a read-only catalog

ADR-0012 gives the operator a queue of what people could not find, and calls it _"the only honest
measure of how good the vocabulary is"_. It never says what the operator can **do** with one.

**Four states: `pending` → `shortlisted` | `dismissed`, and `authored` carrying a `skill_id`.**
_Shortlisted_ is chosen as a word that cannot be misread as _added_.

### `@repo/catalog` becomes writable by an operator, and the sieve moves into the form

ADR-0006 declares `@repo/catalog` _"seeded, read-only at runtime, so no term is created by a user,
ever"_ — which would mean every new word costs a seed change, a migration and a deploy. **That reading
is reversed here**, and ADR-0012's own reasoning is what reverses it: it rejected case-by-case
adjudication partly because _"the Skill Suggestion queue **abolishes 'seed time'** — term-adding is
continuous"_. A vocabulary designed to grow continuously should not need a release per word.

The catalog is already a Postgres table; _read-only at runtime_ was a discipline, not a property. So
the real question was only **who may write it**, and three of the four objections are work rather than
argument: `search_text` moves from seed-time precomputation to computation on write (ADR-0014's
promise that _`unaccent` never runs in a query_ is preserved, only its reason changes); the slug needs
a uniqueness constraint because it becomes a public indexable URL segment under ADR-0011; retirement
stays `retired` + `superseded_by`, unchanged.

**The fourth objection is real and is answered rather than waived.** ADR-0012's proxy rule — _a term
names something you do, never something you are_ — is an **art. 5 discrimination sieve**, not editorial
taste. A release runs it past a diff and the pull-request gate; a form runs it past one person late at
night.

**So the sieve moves into the form.** Before a Skill saves, the operator answers ADR-0012's own
tie-breaker — _could a person **without** the protected attribute plausibly hold this?_ — and the
answer is stored on the row. ADR-0012 rejected case-by-case judgement because _"Ley 1581 puts the
burden on the Responsable to **demonstrate** compliance: a written rule plus a term list is
demonstrable, 'we used our judgement on each one' is not."_ A recorded answer per term is **more**
demonstrable than a seed diff, not less: the diff records that a term was added, this records that the
rule was applied to it.

Accepted with it: **a term authored at 11pm is live and indexed immediately, with no second reader.**
The mitigation is that `retired` is one click and existing links keep resolving, which ADR-0012 already
built.

### The person is never told

No reply, ever, in v1. ADR-0012 forbids promising the term, and between _"we added it"_ and silence
there is no honest message.

**This closes something larger.** ADR-0015 named three events that would earn a `notifications` table
— _a Report resolved, a Photo approved, a Skill Suggestion answered_. ADR-0013 killed the first (never
notified), ADR-0027 killed the second and observed the list was _"one event short of the argument"_.
This is the third. **ADR-0015's condition now has no candidate left in v1**, and the outbox remains all
this product needs.

## Data requests: the door ADR-0020 never located

Everything about this list is ADR-0020's decision rendered. It adds exactly one thing: **the form for a
request that arrived by email**, which ADR-0020 requires — _"an operator creates the row by hand"_ — and
never places.

Three controls and no more: **add**, **mark complete** (which stamps `due_at`, once, never
recomputed), **mark resolved**. The list shows the two ADR-0020 columns, the derived _reclamo en
trámite_ legend, and business days remaining.

The reply itself is composed and sent out of band, exactly as ADR-0020 specifies — _"redacting prose is
judgement no code can make"_ — and this surface records that it happened without authoring it.

## The exposure we do not reduce

ADR-0010 accepted a residual on the record: pre-moderation means the operator views every face on the
platform. **Nothing here reduces it, and that is a decision rather than an omission.**

Blur-until-click and thumbnails-first were both considered. The operator's task **is** to look at the
face, and ADR-0027's vocabulary makes four of six codes undecidable from a blurred or small image —
`other_people`, `contact_visible`, `document` and `face_not_visible` in particular. Friction that must
be clicked through every time buys no privacy: the row count in the access log is identical either way.

The honest mitigation is the one already built: there is exactly one operator, every issuance is
recorded, the queue is small, and the surface says so on the screen.

## Two boundaries, so they are not quoted wrongly later

**ADR-0026 forbids per-person signals and does not reach this surface.** That prohibition governs
surfaces showing a Person **to somebody else** — a report count beside a profile turns queue latency
into a public accusation. The operator's queue shows **work to the operator**, and ADR-0013 requires it
to: _"accumulation reorders the queue and does nothing else."_ ADR-0027 drew the first boundary on
ADR-0026 (the owner's own Photo screen); this is the second, and the two must never be quoted at each
other.

**ADR-0025's equal-weight rule does not reach it either.** A filled primary beside a ghosted escape is
forbidden on **consent** surfaces, because D.1377 art. 6's ban on conditioning arrives through CSS. It
protects a Titular being asked to hand over sensitive data. Nobody consents on this surface, so the
ordinary pairing is allowed.

## The sidebar tokens stop being aliases

`globals.css` parked every `--sidebar-*` token as an alias of the page token it would otherwise
duplicate, and said the day a real navigation surface is designed is the day to give them values
_"deliberately, and with the pairs re-audited"_. **This is that surface** — the first and, in v1, the
only persistent navigation in the product, since ADR-0011 gives the public side a Wall and a Public
View rather than a nav.

The sidebar sits **one step off the page**, not a second palette: same hue, same ink, a deeper ground.
Three tokens left the alias — `--sidebar`, because a nav that only just leaves the page reads as a
rendering artefact; `--sidebar-accent`, because the page value was picked against white and nearly
vanishes on the sidebar's own ground, leaving hover and the current item to separate by almost nothing;
and `--sidebar-border`, measured against the darker of the two surfaces it divides. The ink and the
brand stay aliases: they do not change because the ground did. `--sidebar-primary` marks the **current
item**, never a call to action.

All four sidebar pairs clear the gate against the real stylesheet.

## Consequences

- **ADR-0009 is amended** — 2FA is required for `operator` and unavailable to everyone else; that
  account is email/password only. Its reasoning about Persons is untouched.
- **ADR-0013 is amended** — `reports.reporter_person_id` is nullable, a null reporter means the
  platform raised it, and an operator-raised Report carries a code and no prose. Its count of internal
  queues goes from three to four.
- **ADR-0006 is amended** — `@repo/catalog` is no longer read-only at runtime; an operator may author a
  Skill. No new package and no new DAG edge: the write is a use case in `apps/web/src/use-cases/`, the
  shape ADR-0028 already chose when it refused an eleventh package for `@repo/jobs`.
- **ADR-0012 is amended** — terms are authored at runtime, and the proxy rule moves from authoring
  discipline into the write path as a recorded per-term answer.
- **ADR-0014 is amended** — `search_text` is computed on write rather than at seed time; the promise
  that `unaccent` never runs in a query is unchanged.
- **ADR-0010's** operator access log, three-day alert and evidentiary row are implemented; its residual
  is confirmed unmitigated.
- **ADR-0011's** re-homing of the access log is discharged.
- **ADR-0020's** missing hand-create path is located.
- **ADR-0015 is extended, not amended** — its third and last notification candidate is decided
  negatively, so the condition it set has nothing left to trigger it in v1.
- **ADR-0021's retention table gains two rows**: `photo_reviews` and the operator access log, both
  `with Person`, both 12 months.
- **ADR-0029 is completed** — the `--sidebar-*` block it parked now carries values, audited.
- **`CONTEXT.md`** gains **Operator**, which every ADR has used since ADR-0010 without ever defining;
  **Photo Review** and **Skill Suggestion** are amended.
- **ADR-0017 gains an Invariant Test** — the `admin` plugin's ban endpoints are never called and
  `persons.status` is the only suspension.
- **`docs/runbook.md`** gains the operator's backup codes, stored with the `subject_key` HMAC.
- **Nothing here has an automated guard beyond that one test.** Under ADR-0017 this surface is a set of
  React components and Server Action adapters, which are two of the three things v1 deliberately does
  not test. The list joins the one ADR-0025 opened.

## Rejected

**A separate admin application.** ADR-0013's argument, applied to the count it actually has.

**Impersonation.** The one admin-plugin capability that silently defeats a control another ADR built:
an impersonated session reads a Person's pending Photo through the product surface, where the access
log does not run.

**Using the plugin's ban.** Timed, automatic, and forbidden by ADR-0013 — kept out by a test rather
than by a comment, because the schema is where the prohibition would otherwise have to be read.

**A contact sheet.** Faster, and it buys throughput this queue does not need at the cost of putting a
dozen strangers' faces on one screen and making batch approval the obvious next feature.

**A claim or `in_review` state.** A lock against nobody.

**Any priority order on the photo queue.** Every candidate sorts people rather than photographs.

**Blur-until-click and thumbnails-first.** Friction that buys no privacy: the operator's task is to
look at the face, and four of six codes are undecidable without it.

**A code list in the picker.** Reintroduces the operator-convenience vocabulary ADR-0027 rejected, on
the one screen where the decision is made.

**Logging list renders.** A list shows no face; logging it weakens what the log means.

**A synthetic operator Person to author platform-raised Reports.** A fabricated Titular in a table of
real ones.

**Replying to a Skill Suggestion.** Any message is either a promise ADR-0012 forbids or silence with
extra steps.

**Release-only authorship of Skills.** A deploy per word, against a vocabulary ADR-0012 designed to
grow continuously.

**Authoring a Skill as a draft invisible until the next release.** Reintroduces the deploy the change
exists to remove.

**SMS or Pushover for the three-day alert.** Priced out by #6, and it would erode ADR-0028's rule that
the escalating channel belongs to the dead man's switch alone.
