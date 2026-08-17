# Prototype — how a person learns their Photo was refused (#29)

**Throwaway.** One self-contained HTML file. Double-click `index.html`, or:

```sh
open docs/design/photo-refusal-prototype/index.html
```

No build, no server, no dependencies. Nothing here is production code.

> Two independent axes — `?variant=` is **what the email says**, `?home=` is **what the app shows** —
> rendered across all three surfaces at once: the email as it lands, the signed-in home, and the
> screen the link opens. Plus four question toggles (`?reason=`, `?approve=`, `?late=`, `?repeat=`).
> Defaults on load are `variant=D&home=card`.

## Verdict

**#29 is decided — ADR-0027.** The file still carries every variant and every toggle, because the
losing options are the evidence for the winner — but the defaults on load are now the decisions:
`?variant=D&home=card&approve=told&late=told&repeat=sharper`.

| Question             | Answer                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| The vocabulary       | **Six codes, authored copy-first**, each naming a property of the photo and the change that fixes it. #28 inherits it finished.                       |
| Where the news lives | **D — the email carries the imperative, the app carries the diagnosis.** Nothing that persists in a mailbox is a proposition about the reader.        |
| The app surface      | **The full card**, not a footnote. Reached by splitting the axis the first pass wrongly bound together.                                               |
| `impersonation` etc. | **Not photo codes.** The photo queue judges photos, the safety queue judges accounts, and a Review has two exits.                                     |
| Approval             | **A message, and not a congratulation.** It is the one place _"una persona la revisó"_ can be said about a specific person without penalising anyone. |
| The missed 3 days    | **A message, with no new date.** Silence cannot be silent anyway — the pending card has to stop asserting something false.                            |
| A repeat refusal     | **Sharper guidance, never a sterner tone and never a count.** Our failure to explain, not their failure to comply.                                    |
| Which Purpose        | **`transactional_messages`.** `news` could not carry it, and the send is not gated on the `photo` Purpose.                                            |

### The two that moved after the first pass

**The axis was split.** _"I like A but the app should borrow concept B"_ — and the reason that was
unbuildable is that every variant bundled an email decision with an app decision. They are
independent, and the combination that is now the default was unreachable until they came apart.

**Variant D did not exist**, and it is the answer to A's flaw rather than a compromise between A and
B. See _How A's flaw is addressed_ below.

## The question, and why it is a tone problem before it is a design problem

ADR-0010 made **re-upload the appeal** — there is no separate appeals process — and destroys the
rejected bytes immediately. That only works if the person learns their Photo was refused and is
brought back to try again. It is also the one place this product tells someone their face was
rejected, against a standing rule that the platform preserves **dignity, agency and income** and never
charity or disaster imagery.

_"Tu foto fue rechazada"_ fails that on its own, and every softening of it fails differently:
_"lamentamos informarte"_ is an institution clearing its throat, _"no cumple nuestras normas
comunitarias"_ makes the person go looking for the rule they broke, and _"¡Ups! Algo salió mal"_ is a
product being cute about somebody's face.

## The finding the vocabulary is built on

**Almost every real cause is a fact about the image, not a judgment of the person.** A photograph of a
cédula, a landscape, two people, a phone number written across the frame, a face too dark to see — in
five of six cases there is nothing to say about the human being at all, only about the file.

So the vocabulary is authored so that **every code names a property of the photo and the change that
fixes it**, which means the sentence _"tu foto fue rechazada"_ never has to be written. The one case
that genuinely is a judgment is isolated, and its copy is shaped by that isolation rather than by
being averaged in with the other five.

This is why #29 authors the vocabulary and #28 inherits it, rather than the reverse. A list authored
for an operator's queue — `INVALID`, `POLICY_VIOLATION`, `LOW_QUALITY` — translates into exactly the
sentence this ticket exists to avoid, and by then the translation is the only lever left.

## The vocabulary — six codes, one message each

Codes are English `snake_case` per ADR-0001 as amended, and stay a **separate vocabulary** from
ADR-0013's Report codes, which that ADR requires. Every Spanish string is the design under review.

| Code               | What the person reads                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `face_not_visible` | **No se te ve la cara.** Puede que esté muy oscura, muy lejos o movida. Con que se te vea de frente basta: no tiene que ser bonita ni profesional.                       |
| `no_person`        | **En la foto no hay nadie.** Va una foto tuya, no de tu negocio, tu herramienta ni tu logo. La cara sirve para que quien te va a contratar sepa con quién está hablando. |
| `other_people`     | **Sale alguien más en la foto.** Solo podemos mostrar tu cara: la otra persona no nos dio permiso para mostrar la suya.                                                  |
| `document`         | **Es la foto de un documento.** No recibimos cédulas, diplomas ni hojas de vida. Esa la borramos apenas la vimos y no queda copia. Aquí va una foto tuya y ya.           |
| `contact_visible`  | **Se ve un número de teléfono en la foto.** Tus datos de contacto se comparten cuando alguien acepta una propuesta, no antes.                                            |
| `not_for_work`     | **No podemos mostrar esta foto en un perfil de trabajo.** Pon otra donde se te vea la cara.                                                                              |

Four of these carry a decision rather than a translation.

- **`face_not_visible` says the photo does not have to be good.** _"No tiene que ser bonita ni
  profesional"_ is there because the most likely second attempt after a quality refusal is no second
  attempt at all — someone concluding they do not have a photo that is good enough. The refusal that
  reads as a standard is the one that loses the Photo permanently.
- **`document` says the bytes are already gone**, in the same breath as the refusal. Photographing
  your cédula and sending it to a website is the single most frightening thing on this list, and
  ADR-0010 makes the reassurance true rather than soothing: the image is destroyed at refusal and no
  copy survives.
- **`contact_visible` repeats the mechanic and never the format.** That is ADR-0026's rule for the
  prose refusal — _"tus datos se comparten cuando aceptas una propuesta"_, never _"formato
  inválido"_ — applied to an image instead of a text field.
- **`not_for_work` is the only one that does not say what to change, and that is the design.** It
  states what **we** cannot do, never what the image is, which is ADR-0026's _state the limit, never
  the risk_ pointed at a person rather than at a stranger. It does not characterise, it does not cite
  a rule, it does not moralise, and **ADR-0010 gives the operator no free text to elaborate with** —
  which is the clause that makes this line survivable rather than merely polite.

### Two codes are deliberately absent, and where they go instead

An operator will sometimes think _this is a stock photo_ or _this person looks under 18_. Neither is a
photo-refusal code here, and the reason is structural rather than squeamish:

- **They are judgments about an account, not about an image.** ADR-0013 already owns both —
  `impersonation` and `underage` are Report codes there, with an operator queue and four operator
  actions behind them.
- **Refusing the Photo under a nearby code would be a lie**, and a copy-first vocabulary cannot
  afford one: the person is told the true code the operator picked, always, with no operator-only
  layer underneath.

So: **the photo queue judges photos and the safety queue judges accounts.** If no image-level code is
true, the Photo is approved and the account is handled under ADR-0013 — which is the right outcome
anyway, since suppressing one image does nothing about a person who is not who they say they are.

_This is a position, and it hands #28 a queue with two exits rather than one._

## Two axes, because the first pass wrongly made them one

The file first shipped three variants that each bundled an email decision with an app decision. The
first round of feedback broke that apart — _"I like A but the app should borrow concept B"_ — and it
was right: **what the email says and what the app shows are independent decisions**, and binding them
together hid the combination that is probably the answer. So:

**`?variant=` — what the email says.** Flip with the arrows, the `←`/`→` keys, or
`?variant=A|B|C|D`.

| Key   | Name                          | The email                                                                   | The bet                                                                                        |
| ----- | ----------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **A** | Email carries the reason      | Subject, reason, guidance and button, all in the inbox                      | The inbox is where people actually are; someone who never opens the site again still learns    |
| **B** | Email only knocks             | Only that something is waiting — no reason, no detail                       | Nothing about a person's face may leave a channel we control and can delete                    |
| **C** | No verdict anywhere           | The step is unfinished and here is what to change; nobody reviewed anything | A verdict reads as a verdict however kindly it is worded, so the answer is to not hold a trial |
| **D** | Email carries the instruction | The outcome, that a human looked, and the change — never the diagnosis      | The message has two halves and only one of them is about the reader — so send the other one    |

**D is the answer to A's flaw and is the default on load**; the reasoning is two sections below.

**`?home=` — what the app shows.**

| Value  | The app surface                                                                            |
| ------ | ------------------------------------------------------------------------------------------ |
| `card` | The full card: the mount, the reason, what did not change, the action                      |
| `line` | One quiet line inside the profile block — the email already did the work                   |
| `step` | ADR-0025's _sin publicar_ card wearing a different hat: an unfinished step, and no verdict |

The three original variants were `A+line`, `B+card` and `C+step`; those combinations still render.
**The defaults on load are `variant=D&home=card`.** Combinations can be incoherent on purpose:
`C+card` puts _"una persona la revisó"_ on a screen whose email denies any review happened, and
looking at that is the fastest way to see what C is actually buying.

### Each email variant has a visible flaw, and the file names it under the surfaces

**A's flaw is that the email outlives the photograph.** ADR-0010 destroys the rejected bytes within
seconds of the refusal; the email describing them sits in a mailbox we cannot reach, possibly shared,
indexed by a third party, for years. Every other decision in that ADR treats a face as sensitive data
whose lifetime we control, and this one hands a sentence about it to Google.

**B's flaw is that its email is phishing-shaped.** _"Hay algo pendiente en tu perfil. Entra y te
contamos"_ with a link is the exact form of the impersonation attack ADR-0026 spent its one
attack-naming sentence closing — and it is the one message of ours a careful person is right to
distrust. It also gets the lowest open rate of the three, which matters when the whole mechanism is
"the person comes back".

**C's flaw is that it is tactful about something the person has a right to know.** A human did look at
this person's face. That is the single true operational fact the platform has (ADR-0026's band item
two), it is what ADR-0010's art. 12 disclosure promises will be said plainly, and burying it under
_"te falta un paso"_ is the product deciding a Titular is better off not knowing what was done with
their data.

### How A's flaw is addressed — variant D, and why it is not a compromise

`A+card` was the direction picked from the first pass, and A's flaw was the one thing left open: the
reason lands permanently in a mailbox we can never reach, outliving by years the photograph ADR-0010
destroys in seconds.

The two obvious answers are both bad. **Accepting it** leaves the product's most sensitive message in
its least controlled channel. **Withholding the reason from the email** — B's discipline — costs a
hop, and every hop between the refusal and the re-upload is a place the Photo is lost for good.

**The third answer came from reading the vocabulary rather than the channel.** The flaw was stated
generically — _a reason code in an email is a permanent statement about somebody's face_ — and that
is not what these six strings are. Taken code by code, the harm is not spread evenly at all; it is
concentrated almost entirely in `not_for_work`, and every other string is a fact about a file.

More usefully: **each message already contains two halves**, a diagnosis (_"es la foto de un
documento"_) and an imperative (_"aquí solo va una foto tuya: nada de cédulas ni papeles"_). Only the
first is a proposition about the reader. The second is a rule that is true of everybody on the
platform, and it carries the same operational information to the one person who knows what they
uploaded.

So **variant D sends the imperative and keeps the diagnosis in the session.** The email still names
the outcome and still says a human looked — A's honesty, intact — and what persists in a shared inbox
says nothing about the reader at all.

| Code               | The email (D)                                             | The app                                                             |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `face_not_visible` | Que se te vea la cara, de frente y con buena luz.         | No se te ve la cara. Puede que esté muy oscura, muy lejos o movida. |
| `no_person`        | Va tu cara, no tu negocio ni tu logo.                     | En la foto no hay nadie. …                                          |
| `other_people`     | Tiene que salir una sola persona: tú.                     | Sale alguien más en la foto. …                                      |
| `document`         | Aquí solo va una foto tuya: nada de cédulas ni papeles.   | Es la foto de un documento. Esa la borramos apenas la vimos. …      |
| `contact_visible`  | Sin números de teléfono ni correos escritos en la imagen. | Se ve un número de teléfono en la foto. …                           |
| `not_for_work`     | Que se te vea la cara, de frente y con buena luz.         | No podemos mostrar esta foto en un perfil de trabajo. …             |

**The last two imperatives are word-for-word identical, and that is the control rather than a
collision.** A per-code channel policy — five reasons travel, the sensitive one does not — was the
first idea and it is wrong for a reason this repo has already established twice: **differential
treatment leaks the thing it protects.** A vaguer email for the bad code makes the vague email
_mean_ the bad code, which is the same failure ADR-0011 avoided by 404-ing rather than 403-ing and
ADR-0015 avoided by making the suspended-counterparty string deliberately incurious. Collapsing the
two imperatives means the email cannot be read backwards to the code.

**D's own cost, stated plainly:** it protects the person whose inbox is shared at the expense of the
person who only ever reads the email. Somebody refused under `not_for_work` receives the same words
as somebody whose photo was dark, and if they never open the app they may re-upload against the wrong
understanding. That is what makes `repeat=sharper` load-bearing here rather than optional.

**The standing rule this proposes, so the argument survives the next code added:** _no reason code may
enter the vocabulary unless its imperative half is a rule true of everyone on the platform._ That is
testable against a single sentence, it is the constraint that makes sending the email safe at all,
and without it the sixth code that gets added quietly reopens the flaw.

### Two problems this ticket surfaced and should not solve

- **No email of ours survives an erasure, and nothing in the map says so.** ADR-0021 hard-deletes the
  `persons` row and ADR-0010 has an R2 adapter for the bytes, but a sent message is outside every
  adapter. This is **not a photo problem** — ADR-0015's Offer notifications name a person and a pay
  figure, which reveals considerably more than _"no se te ve la cara"_ — so fixing it here would be
  fixing it in the wrong place. Belongs to the map as a finding against the notifications lane.
- **Nothing here has been through an email client.** The frame is a table cell with a background;
  dark-mode inversion in Gmail and Outlook is exactly the kind of thing that would undo the "not
  alarm" decision without anybody noticing. Named in the accessibility section, not fixed.

## The design — one signature, and it is the reason it exists

The first pass was, correctly, called raw. What it lacked was not decoration but a **subject**: the
message is about a photograph that the reader cannot see and neither can we, because ADR-0010
destroys the rejected bytes within seconds of the refusal.

**So the absence is the object, and the reason is set inside the rectangle where the photo is not** —
a photo-proportioned frame with a mat inset, holding the reason and nothing else. The same rectangle
returns in outline on the upload screen as the place you put the new one. It runs across all three
surfaces and carries the thesis of the vocabulary structurally rather than in prose: **the refusal is
a property of that rectangle, never of the person holding it.**

**The frame was drawn dark first, and that was wrong.** On a message about somebody's face a black
panel reads as mourning, which is one step from the disaster register the product exists to refuse —
and the frame is not improved by weight, only by being unmistakably a frame. The shape was the whole
argument; the darkness was decoration wearing the argument's clothes. It is light now, on the brand
tint, with the mat inset doing the work.

Two things it is deliberately not:

- **Not an avatar placeholder.** ADR-0026 bans those, and the ban is about a **profile card**, where
  an empty disc beside a human being is a penalty rendered in CSS on behalf of somebody who declined
  to supply sensitive data. This is the person's own photo screen, where the rectangle is the object
  under discussion and naming it is the entire point. The two rules must not be quoted at each other.
- **Not alarm.** No red, no warning triangle, no `--color-danger` anywhere on the refusal path — the
  palette stays the standing brand blue and ink, and the only saturated colour on the surface is the
  action.

Everything else is restraint: one type scale with real weight contrast, a mono eyebrow that labels
rather than decorates, and generous space. The email carries the same frame, which is a claim worth
testing — it is a table cell with a background in a real client, and nothing here has been through
one.

## The toggles

### `?reason=` — which code is on screen

Cycles the six. Drives the email, the home card, the landing screen and the repeat strips at once, so
each message can be read in every position it will occupy.

### `?approve=` — is silence right when a Photo is approved?

| Value    | Behaviour                                                                                     |
| -------- | --------------------------------------------------------------------------------------------- |
| `told`   | _"Tu foto ya está en tu perfil. Una persona la revisó."_ plus one line on how to remove it    |
| `silent` | Nothing. The pending state stops being pending and whoever does not come back never finds out |

_Position: `told`._ Three reasons. The person was shown _menos de 3 días_ and left waiting, so
silence means the only way to learn the answer is to come back and check — and ADR-0025's whole
argument is that people do not come back. It is the one moment where _"una persona la revisó"_ can be
said to somebody without making a profile without a Photo carry visibly less, which is exactly why
ADR-0026 forbids it everywhere else. And email is effectively free (#6).

**It is not a congratulation.** No _¡Felicitaciones!_, no green tick, no badge — ADR-0026 titled
itself _there is no badge to earn_, and ADR-0025's own ending refuses to celebrate. The closing line
is how to take it down, because ADR-0010 rule 5 holds that publication is never a licence.

### `?late=` — does anyone hear when we miss the 3 days?

| Value    | Behaviour                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------ |
| `told`   | _"Tu foto sigue en revisión. Dijimos que menos de 3 días y no cumplimos."_ — and **no new date** |
| `silent` | No message; the pending card quietly stops claiming three days                                   |

_Position: `told`._ ADR-0010 forbids any automatic transition, so a missed commitment is purely a copy
problem — and note that even `silent` cannot be truly silent: leaving _"suele tardar menos de 3
días"_ on screen on day five is the product asserting something false. Once you have accepted that
edit, the person can already see we missed it and we still have not said so.

**No new date is the load-bearing half.** A second promise we might also miss is worse than none, and
ADR-0013 refused a response-time commitment on Reports for the same reason.

### `?repeat=` — does the second refusal for the same reason read differently?

| Value       | Behaviour                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `sharper`   | Same message, plus more concrete guidance — _"prueba de día, cerca de una ventana, sin gorra"_ |
| `same`      | Word-for-word identical, forever                                                               |
| `escalates` | _"Es la tercera foto que no podemos mostrar…"_ and a threat to the account                     |

_Position: `sharper`._ It treats a second refusal as **our** failure to explain rather than the
person's failure to comply, and it is the only one of the three that makes the next attempt more
likely to work. `same` is the purest reading of ADR-0013 — the evidentiary rows are for the operator
and nothing accumulates where the person can see it — but it repeats guidance that has already failed
once, which is not restraint, only stubbornness.

**`escalates` is in the file to be looked at and rejected.** It is the platform keeping score against
somebody's face; it threatens an account over the one Purpose that can never be required (ADR-0007);
and ADR-0013 refused accumulation-triggered action for the entire product on the ground that it is a
brigading weapon. The evidentiary row ADR-0010 keeps stays where it was put — visible to the operator,
invisible here.

## Which Purpose carries the send

**`transactional_messages`**, and it is not close.

- Ley 2300 art. 5 par. 2 permits requiring consent to messages _"estrictamente relacionados con el
  bien o servicio adquirido"_, which is why ADR-0007 could make this Purpose required at all. The
  outcome of a review the person themselves initiated is the paradigm case.
- **`news` could not carry it.** `news` is optional, so a person who declined it would never learn
  their Photo was refused — and would keep a permanently invisible Photo with no way to find out.
- **The send is not gated on the `photo` Purpose.** That Purpose authorises _showing_ a Photo; the
  message is about a service outcome. Gating it would mean revoking `photo` consent silently disables
  the only channel that could confirm the deletion.

The email footer states this plainly rather than offering a fake unsubscribe: _"Te escribimos porque
es un mensaje del servicio, no publicidad. Estos no se pueden desactivar; los de novedades sí, en Tus
datos."_ An unsubscribe link on a required Purpose is a control that does nothing, and D.1377 art. 7
forbids treating a person's silence as consent, not the reverse.

**One rule that is not negotiable in any variant: no email ever carries the image.** Not the rejected
one, not a thumbnail, not a link to one. The rejected bytes are gone by the time the message is
composed, and an approved photograph does not need reprinting in a mailbox.

## Voice — audit against what exists, plus the context nobody had written

`brand-voice` was run in **audit mode**, not to produce a guide. A guide is its own effort and the map
puts it past the destination; what did not exist was the one context this ticket lives in.

### The fragments that already exist, and where they are

There is no voice guide, but there are five binding fragments in four places — which is itself the
map's open item _"where the binding half of `NEXTJS_HANDOFF.md` lives"_:

| Fragment                                                     | Where it lives                     |
| ------------------------------------------------------------ | ---------------------------------- |
| Address rule — `tú`, the verb belongs to the reader          | `CONTEXT.md`                       |
| Gender-agreement rule — the adjective agrees with the object | `CONTEXT.md`                       |
| Archetype and dimension sketch, Never/Always lists           | `skill-picker-prototype/README.md` |
| _State the limit, never the risk_                            | ADR-0026                           |
| The ending refuses to celebrate                              | ADR-0025                           |

### Dimensions, read off those fragments

Extremes in bold, per the skill's rule of two or three.

| Dimension      | Setting | Why                                                                           |
| -------------- | ------- | ----------------------------------------------------------------------------- |
| Formality      | 4       | `tú`, contractions of register, no institutional throat-clearing              |
| Optimism       | 3       | The product refuses to promise work; it cannot afford to be sunny             |
| Humor          | **1**   | Not solemn, but never funny about somebody's income or face                   |
| Confidence     | 4       | Hedged copy makes the reader argue instead of act                             |
| Sophistication | **1**   | Short sentences, common words, no product vocabulary                          |
| Warmth         | 4       | Neighbour, not institution — and not caregiver                                |
| Energy         | 2       | Calm. Exclamation marks are the charity register arriving through punctuation |
| Directness     | **5**   | The whole product is built on saying what it does not do                      |

### The tone matrix entry this ticket adds

Context: **Refusal** — the product delivering bad news about the reader's own body.

> **Energy 2 → 1. Optimism 3 → 2. Nothing else moves.**

The finding is the second sentence. Every instinct on bad news is to raise Warmth, lower Directness
and lower Confidence, and all three are wrong here:

- **Warmth 4 → 5 produces pity**, which is the charity register the product exists to refuse. _"Sabemos
  lo difícil que es"_ about a photograph is worse than the blunt version.
- **Directness 5 → 3 produces euphemism**, and euphemism about a face reads as something being
  concealed. It also fails the operational test: a person who cannot tell what to change does not
  re-upload, and re-upload is the appeal.
- **Confidence 4 → 2 produces _"creemos que quizás"_**, which invites an argument the product has no
  surface to hold — there is no appeals process, only the upload button.

### Scorecard — the obvious drafts, against the rules

| Draft                                                 | Verdict                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| _Tu foto fue rechazada._                              | **Fail.** The verb acts on the person's face; nothing says what to change.                           |
| _Lamentamos informarte que…_                          | **Fail.** Formality 4 → 1, and the subject is us being sorry rather than the reader doing something. |
| _Tu foto no cumple con nuestras normas comunitarias._ | **Fail.** Sends the reader looking for a rule; Sophistication 1 breached by _normas comunitarias_.   |
| _¡Ups! Algo salió mal con tu foto._                   | **Fail.** Humor 1, and it is a product being cute about a face.                                      |
| _Tu foto fue aprobada ✅ ¡Felicitaciones!_            | **Fail.** ADR-0026 — there is no badge to earn.                                                      |

### Before / after

1. _"Tu foto fue rechazada. Motivo: contenido inapropiado."_ → **"No podemos mostrar esta foto en un
   perfil de trabajo. Pon otra donde se te vea la cara."** — _state the limit, never the risk_; the
   subject becomes what we cannot do, and the second sentence is the exit.
2. _"Lamentamos informarte que tu foto no cumple con nuestras normas comunitarias."_ → **"Tu foto
   todavía no está en tu perfil. Una persona la revisó y hay algo que cambiar."** — Directness 5,
   Sophistication 1, and the gender-agreement rule: the adjective agrees with the profile, never with
   the reader.
3. _"¡Felicitaciones! Tu foto fue aprobada ✅"_ → **"Tu foto ya está en tu perfil. Una persona la
   revisó."** — Energy 1, Humor 1; the fact replaces the celebration.

### Two Never entries this ticket adds

- **Never the passive voice with the person's face as the object.** _"Tu foto fue rechazada"_,
  _"fue revisada"_, _"no fue aprobada"_. There is a human being on both ends and the sentence should
  say which one did what.
- **Never a rule the reader has to go and read.** No _"normas comunitarias"_, no _"nuestras
  políticas"_, no link to a policy page. The refusal carries its own reason or it is not a refusal,
  it is a homework assignment.

## Accessibility

Held to the `NEXTJS_HANDOFF.md` bar, which the map records as still binding.

Present: a polite live region announcing every variant and toggle change; arrow keys that do not fire
while an input is focused; the two upload controls rendered at **equal visual weight** per ADR-0025
(two outlined buttons, neither filled), which is a legal constraint here and not a preference; no
meaning carried by colour alone — the highlighted checklist row is bolded as well as tinted; targets
above 40px; text at 100% zoom reflow.

**Not cleared, and worth knowing:** none of this has been through a screen reader, the email surfaces
are rendered as HTML on a page rather than in a real client (so nothing here says anything about how
they degrade in Outlook or in plain text), and the refusal copy has not been read aloud to anybody
who has actually had a photo refused.

## Departures from the named skills

- **`/prototype`'s UI branch wants a route** (sub-shape A on an existing page, or B as a throwaway
  route). This is a single HTML file instead — the same departure `skill-picker-prototype` and
  `trust-presentation-prototype` recorded, and for a narrower reason than the map states.
  `@repo/design-system` now exists, so _"it does not exist yet"_ is stale; what holds is that it ships
  un-built React source, `apps/web` has no `src/` at all, and a `file://` page cannot consume React.
- **`/prototype` warns against variants that differ only in copy.** These do not: they differ in which
  surface is the record, whether the reason crosses a channel boundary, and whether a refusal is an
  event at all. But the ticket is right that the copy is the decision, so the file renders every
  surface at once rather than one page three ways.
- **`brand-voice` was run in audit mode only**, by the choice recorded at the top of this section. Its
  intake, archetype selection and full guide were not run.
- **`frontend-design` was added to this ticket's skills**, which named only `prototype` and
  `brand-voice`. The first pass was called raw, and _"how does a refusal look without looking like an
  alarm"_ is squarely its subject. It is worth recording that its brief and this one pull in opposite
  directions: it asks for a distinctive identity and one justified aesthetic risk, and this repo
  already has a binding palette, typeface and accessibility bar. So the palette was not touched, and
  **the one risk it did prompt — the dark frame — was taken and then rejected**, which is the honest
  outcome and is left in the record above rather than quietly reverted.
- **`shadcn` was not loaded.** Its CLI refuses to run at a monorepo root and wants
  `-c packages/design-system`; there is one component in that package (`button.tsx`) and nothing on
  this screen needs it. Tokens are `NEXTJS_HANDOFF.md`'s, matching the sibling prototype — the design
  system that landed ships the shadcn `vega` preset and the two palettes disagree, which no ADR
  reconciles and this ticket does not own.

## Open calls this prototype takes without being asked to

Flag any of these that are wrong — they are positions, not defaults.

1. **#29 authors the reason vocabulary and #28 inherits it**, reversing the direction ADR-0010
   implied. Confirmed with the dev before building.
2. **There is no operator-only code.** The person is always shown the same code the operator picked.
3. **`impersonation` and `underage` are not photo codes** — the photo queue judges photos, the safety
   queue judges accounts, and #28 gets a queue with two exits.
4. **The approval case gets a message**, and it is not a congratulation.
5. **The 3-day miss gets a message with no new date.**
6. **A repeat refusal for the same code gets sharper guidance, never a sterner tone and never a
   count.**
7. **`face_not_visible` says the photo does not have to be good**, on the theory that the most common
   second attempt is no second attempt.
8. **No email ever carries the image**, in any variant.
9. **The reason is set inside a photo-shaped frame, and that is not the avatar placeholder ADR-0026
   bans.** The ban protects a profile card from rendering somebody second-class; this is the person's
   own photo screen, where the rectangle is the subject. Worth an explicit line in the ADR so the two
   rules are never quoted at each other.
10. **The refusal path uses no alarm colour at all** — no red, no warning mark. A refusal that looks
    like an error teaches the reader they did something wrong, and in five of six cases they did not.
11. **The email carries the imperative half and never the diagnosis** (variant D), and
    `not_for_work`'s imperative is deliberately identical to `face_not_visible`'s so the email cannot
    be read backwards to the code.
12. **A standing constraint on the vocabulary**: no code may be added unless its imperative half is a
    rule true of everyone on the platform. This is what makes sending the email safe, so it has to be
    a rule and not an observation about the six that exist today.
