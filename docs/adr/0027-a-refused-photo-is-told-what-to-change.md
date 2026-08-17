# A refused Photo is told what to change, and the email carries only the half that is true of everyone

ADR-0010 made **re-upload the appeal** — there is no separate appeals process in v1 — and destroys the
rejected bytes immediately. The whole mechanism therefore rests on a message: the person has to learn
the Photo was refused and come back. Nobody had designed that message, and it is the one place this
product tells someone their face was rejected, against a standing rule that Encuentra preserves
_dignity, agency and income_ and never charity or disaster imagery.

_"Tu foto fue rechazada"_ fails that on its own, and each softening fails differently: _"lamentamos
informarte"_ is an institution clearing its throat, _"no cumple nuestras normas comunitarias"_ sends
the reader looking for the rule they broke, _"¡Ups! Algo salió mal"_ is a product being cute about
somebody's face.

This ADR decides the vocabulary, the channel, the re-upload path, the approval case, the repeat case
and the timeout case. Prototyped at `docs/design/photo-refusal-prototype/` on
`prototype/photo-refusal-notice`, four email variants against three app surfaces.

## The vocabulary is authored copy-first, and that is what makes the tone problem tractable

ADR-0010 fixes that a refusal carries a code from a fixed vocabulary and forbids operator prose. It
never says what the codes are, and its consequences hand them to #13 — which then declined them,
recording only that they stay a **separate vocabulary** from its own Report codes. So nobody had
written them.

**They are authored here, sentence first, code second**, reversing the direction ADR-0010 implied.
A list authored for an operator's queue — `INVALID`, `POLICY_VIOLATION`, `LOW_QUALITY` — translates
into exactly the sentence this ADR exists to avoid, and by the time it is being translated the
translation is the only lever left.

Written the other way round, the finding falls out immediately: **almost every real cause is a fact
about the image, not a judgment of the person.** A photograph of a cédula, a landscape, two people, a
phone number across the frame, a face too dark to make out — in five of six cases there is nothing to
say about the human being at all. So every code names **a property of the photo and the change that
fixes it**, and the sentence _"tu foto fue rechazada"_ never has to be written.

| Code               | The diagnosis (in the session)                                                                                                                                         | The imperative (in the email)                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `face_not_visible` | _No se te ve la cara._ Puede que esté muy oscura, muy lejos o movida. Con que se te vea de frente basta: no tiene que ser bonita ni profesional.                       | _Que se te vea la cara, de frente y con buena luz._         |
| `no_person`        | _En la foto no hay nadie._ Va una foto tuya, no de tu negocio, tu herramienta ni tu logo. La cara sirve para que quien te va a contratar sepa con quién está hablando. | _Va tu cara, no tu negocio ni tu logo._                     |
| `other_people`     | _Sale alguien más en la foto._ Solo podemos mostrar tu cara: la otra persona no nos dio permiso para mostrar la suya.                                                  | _Tiene que salir una sola persona: tú._                     |
| `document`         | _Es la foto de un documento._ No recibimos cédulas, diplomas ni hojas de vida. Esa la borramos apenas la vimos y no queda copia. Aquí va una foto tuya y ya.           | _Aquí solo va una foto tuya: nada de cédulas ni papeles._   |
| `contact_visible`  | _Se ve un número de teléfono en la foto._ Tus datos de contacto se comparten cuando alguien acepta una propuesta, no antes.                                            | _Sin números de teléfono ni correos escritos en la imagen._ |
| `not_for_work`     | _No podemos mostrar esta foto en un perfil de trabajo._ Pon otra donde se te vea la cara.                                                                              | _Que se te vea la cara, de frente y con buena luz._         |

Codes are English `snake_case` per ADR-0001 as amended, and remain the separate vocabulary ADR-0013
requires. Four carry a decision rather than a translation:

- **`face_not_visible` says the photo does not have to be good.** _"No tiene que ser bonita ni
  profesional"_ exists because the most likely second attempt after a quality refusal is **no second
  attempt at all** — somebody concluding they have no photograph good enough. A refusal that reads as
  a standard is the one that loses the Photo permanently, and rule 1 forbids us to cost anybody
  anything for not having one.
- **`document` says the bytes are already gone**, in the same breath as the refusal. Photographing a
  cédula and sending it to a website is the most frightening thing on this list, and ADR-0010 makes
  the reassurance true rather than soothing.
- **`contact_visible` repeats the mechanic and never the format.** ADR-0026's rule for the prose
  refusal, applied to an image instead of a text field.
- **`not_for_work` is the only one that does not say what to change, and that is the design.** It
  states what **we** cannot do, never what the image is — ADR-0026's _state the limit, never the
  risk_, pointed at a person rather than at a stranger. It does not characterise, cite a rule or
  moralise, and **ADR-0010 gives the operator no free text to elaborate with**, which is the clause
  that makes the line survivable rather than merely polite.

### Two codes are deliberately absent

An operator will sometimes think _this is a stock photo_ or _this person looks under 18_. Neither is a
photo-refusal code, because **they are judgments about an account rather than about an image**, and
ADR-0013 already owns both as Report codes with an operator queue behind them. Refusing the Photo
under a nearby code would be a lie, and this vocabulary cannot afford one: **there is no
operator-only layer — the person is always shown the same code the operator picked.**

So **the photo queue judges photos and the safety queue judges accounts.** Where no image-level code
is true, the Photo is approved and the account is handled under ADR-0013 — which is the right outcome
anyway, since suppressing one image does nothing about somebody who is not who they say they are.

## The email carries the imperative, and the diagnosis stays in the session

The channel question looked like a straight choice and was not.

Putting the reason in the email is what reaches the person who never opens the site again, and the
whole mechanism is "the person comes back". But **the reason then outlives the photograph**: a
sentence about somebody's face, in clear text, in a mailbox that may be shared, retained by a third
party, and outside every erasure adapter we have — while ADR-0010 destroys the image itself within
seconds. Withholding the reason answers that and costs a hop, and **every hop between the refusal and
the re-upload is a place the Photo is lost for good**.

**The resolution came from reading the vocabulary rather than the channel.** Each message already
contains two halves: a **diagnosis**, which is a proposition about the reader, and an **imperative**,
which is a rule true of everybody on the platform. The imperative carries the same operational
information to the one person who knows what they uploaded, and nothing at all to anyone else.

So the email names the outcome, says plainly that a human looked, and carries **only the imperative**.
The diagnosis lives in the session. Nothing that persists in a mailbox is a statement about the
reader.

> **Tu foto todavía no está en tu perfil.** Una persona la revisó y hay algo que cambiar.
>
> _Lo que sirve:_ **Aquí solo va una foto tuya: nada de cédulas ni papeles.**
>
> Tu perfil sigue igual: sales en las búsquedas y te pueden mandar propuestas. Lo único que falta es
> la foto.

**`not_for_work` and `face_not_visible` share one imperative, word for word, and that is the control
rather than a collision.** The first idea was a per-code channel policy — five reasons travel, the
sensitive one does not — and it is wrong for a reason this repo has already established twice:
**differential treatment leaks the thing it protects.** A vaguer email for the sensitive code makes
the vague email _mean_ that code, which is the failure ADR-0011 avoided by 404-ing rather than
403-ing, and ADR-0015 avoided by making the suspended-counterparty string deliberately incurious.
Collapsing the two imperatives is what stops the email being read backwards to the code.

**The cost, named rather than hidden:** this protects the person whose inbox is shared at the expense
of the person who only ever reads the email. Somebody refused under `not_for_work` receives the same
words as somebody whose photo was dark, and if they never open the app they may re-upload against the
wrong understanding. That is what makes the repeat rule below load-bearing rather than optional.

**A standing constraint on the vocabulary, so the argument survives the next code added:**

> **No reason code may enter this vocabulary unless its imperative half is a rule true of everyone on
> the platform.**

Without it, the sixth code somebody adds quietly reopens the whole question. It is testable against a
single sentence, which is the only kind of rule worth writing here.

**No email ever carries the image** — not the rejected one, not a thumbnail, not a link to one. The
rejected bytes are gone before the message is composed, and an approved photograph does not need
reprinting in a mailbox.

## `transactional_messages` carries the send

Not close, and recorded because the ticket asked.

- **Ley 2300 art. 5 par. 2** permits requiring consent to messages _"estrictamente relacionados con el
  bien o servicio adquirido"_, which is why ADR-0007 could make this Purpose required at all. The
  outcome of a review the person themselves started is the paradigm case.
- **`news` could not carry it.** `news` is optional, so somebody who declined it would never learn
  their Photo was refused and would hold a permanently invisible Photo with no way to find out.
- **The send is not gated on the `photo` Purpose.** That Purpose authorises _showing_ a Photo; this is
  a service outcome. Gating it would mean revoking `photo` consent silently disables the only channel
  that could confirm the deletion.

The footer states this rather than offering a control that does nothing: _"Te escribimos porque es un
mensaje del servicio, no publicidad. Estos no se pueden desactivar; los de novedades sí, en Tus
datos."_

## No notification system, and the outbox already exists

ADR-0015 refused a `notifications` table and named the condition for revisiting it: _"a notification
system earns its place when events stop being 1:1 with a domain row (a Report resolved, **a Photo
approved**, a Skill Suggestion answered)"_.

**This is the decision with that event in hand, and the condition is not met.** A Photo approval or
refusal is exactly 1:1 with the Photo row, which already carries the state a notification would
announce — so a `notifications` table would be the denormalised copy able to disagree that ADR-0015
rejected. What this needs is what ADR-0015 already built: **an outbox row written inside the
transaction and drained after commit**, so a rollback cannot leave a sent email describing a refusal
that did not happen.

That is the second entry on ADR-0015's list gone. The list is not empty — a Skill Suggestion answered
is still out there — but it is now one event short of the argument.

## The re-upload path restates the diagnosis, always

The link lands on the Photo screen, and **the diagnosis is restated there in every case**. An email
read on a bus and opened an hour later has lost its context, and under the channel decision above the
email never carried the diagnosis in the first place.

The screen carries, before any file is chosen, the guidance that prevents a second refusal — phrased
as what works rather than as prohibitions, with the item matching the refusal emphasised:

> Que se te vea la cara. · Que salgas tú, no tu negocio ni tu logo. · Que no salga nadie más. · Nada
> de cédulas, diplomas ni papeles. · Sin números ni correos escritos en la imagen.

**ADR-0025's three properties are inherited unchanged and are not preferences**: the two controls at
equal visual weight, the cost of skipping stated, and the screen never placed last before publishing.
A refusal does not suspend D.1377 art. 6 — if anything it is the moment the pressure to nudge is
highest, because the Photo is now a thing the person has failed to supply twice.

## The approval case is a message, and it is not a congratulation

Silence is defensible — an approval is not news — but it leaves somebody who was shown _menos de 3
días_ with no way to learn the answer except by coming back to check, and **ADR-0025's whole argument
is that people do not come back.**

> **Tu foto ya está en tu perfil.** Una persona la revisó. Ahora la ve quien entre a tu perfil.
>
> Si algún día la quieres quitar, se quita en un toque.

Three things about it are decisions:

- **It says a human looked.** This is the only moment that sentence can be said to a specific person
  without cost. ADR-0026 forbids it on a profile precisely because attaching it there makes a profile
  without a Photo carry visibly less — the second-class rendering ADR-0010 rule 1 bans. Said to the
  owner about their own Photo, it penalises nobody.
- **It does not celebrate.** No _¡Felicitaciones!_, no tick, no badge. ADR-0026 is titled _there is no
  badge to earn_ and ADR-0025's ending already refuses to celebrate; an approval that reads as an
  award teaches that the platform grades faces.
- **It closes on how to remove it**, because ADR-0010 rule 5 holds that publication by the Titular is
  never a licence. Revocation has to be one tap and it has to be visible at the moment consent has
  just been vindicated.

## The timeout case is a message with no new date

ADR-0010 displays _menos de 3 días_ and forbids any automatic state transition, so a missed
commitment is purely a copy problem.

> **Tu foto sigue en revisión.** Dijimos que menos de 3 días y no cumplimos. No se perdió y no tienes
> que hacer nada.

**Silence cannot actually be silent**, which is what settles this: leaving _"suele tardar menos de 3
días"_ on the pending card on day five is the product asserting something false, so even the quiet
option requires editing that card. Once that edit is accepted, the person can already see we missed
it and we still have not said so.

**No new date.** A second promise we might also miss is worse than none — ADR-0013 refused a
response-time commitment on Reports for the same reason, and ADR-0010 warns that a routinely missed
three days is the signal to revisit pre-moderation rather than to weaken the escalation.

## A repeat refusal gets sharper guidance, never a sterner tone and never a count

ADR-0010 keeps an evidentiary row per refusal for #13's benefit. **This surface never reads it as a
count.** What changes on a second refusal for the **same** code is that the guidance becomes more
concrete:

> Prueba de día, cerca de una ventana, con el teléfono a la altura de la cara. Sin gorra y sin gafas
> oscuras.

This treats a second refusal as **our failure to explain** rather than the person's failure to
comply, and it is the only treatment that makes the next attempt more likely to work — which matters
doubly under the channel decision, since the email-only reader is the one most likely to have
misunderstood.

**Escalation is refused outright.** _"Es la tercera foto que no podemos mostrar"_ is the platform
keeping score against somebody's face; it threatens an account over the one Purpose that can never be
required (ADR-0007); and ADR-0013 refused accumulation-triggered action across the whole product on
the ground that it is a brigading weapon. Identical-forever was the purest reading of that ADR and
loses only because repeating guidance that has already failed once is not restraint.

## The refusal is a property of a rectangle, not of a person

Stated here because otherwise it is decided by whoever writes the component.

ADR-0010 destroys the rejected bytes within seconds, so **the photograph can never be shown back to
its owner** — the message is about something neither party can see. The diagnosis is therefore set
**inside a photo-proportioned frame with a mat inset**, in the space where the photo is not, and the
same rectangle returns in outline on the upload screen as the place the new one goes. It carries the
vocabulary's thesis structurally rather than in prose.

**This is not the avatar placeholder ADR-0026 bans**, and the two must never be quoted at each other.
That ban protects a **profile card**, where an empty disc beside a human being is a penalty rendered
in CSS on behalf of somebody who declined to supply sensitive data. This is the person's own Photo
screen, where the rectangle is the object under discussion and naming it is the point.

**Nothing on the refusal path uses an alarm colour** — no red, no warning mark, no `danger` token. A
refusal that looks like an error teaches the reader they did something wrong, and in five of six cases
they did not. The frame was drawn dark in the first pass and rejected: on a message about somebody's
face a black panel reads as mourning, one step from the disaster register the product exists to
refuse.

## The tone rule this generalises

The dimensions everyone's instinct says to move when delivering bad news are exactly the ones that
must not move. Against the voice fragments already scattered across `CONTEXT.md`, ADR-0023, ADR-0025
and ADR-0026:

> **Refusal: Energy 2 → 1, Optimism 3 → 2. Nothing else moves.**

- **Warmth up produces pity**, which is the charity register the product exists to refuse. _"Sabemos
  lo difícil que es"_ about a photograph is worse than the blunt version.
- **Directness down produces euphemism**, and euphemism about a face reads as concealment. It also
  fails operationally: somebody who cannot tell what to change does not re-upload, and re-upload is
  the appeal.
- **Confidence down produces _"creemos que quizás"_**, inviting an argument the product has no surface
  to hold — there is no appeals process, only the upload button.

Two additions to the Never list: **never the passive voice with the person's face as its object**
(_"tu foto fue rechazada"_, _"fue revisada"_ — there is a human at both ends and the sentence should
say which did what), and **never a rule the reader has to go and read** (no _"normas comunitarias"_,
no link to a policy page; the refusal carries its own reason or it is a homework assignment).

## Consequences

- **ADR-0010's reason-code vocabulary is authored**, and its consequence handing them to #13 is
  discharged — via #29 rather than #13, which had already declined them.
- **ADR-0015 is extended, not amended**: a Photo approved is 1:1 with the Photo row, so it does not
  meet that ADR's condition for a notification system, and its outbox carries these sends.
- **ADR-0026 gains an explicit boundary**: the no-placeholder rule governs a profile card, not the
  owner's own Photo screen.
- **ADR-0007 is confirmed unchanged**: `transactional_messages` carries the send, `news` could not,
  and nothing here is gated on the `photo` Purpose.
- **`CONTEXT.md`'s Photo Review is amended** to name the vocabulary's two exits.
- **#28 inherits a finished vocabulary and a queue with two exits** — refuse the image, or approve it
  and raise an ADR-0013 matter about the account. It still owns how an operator picks a code, the
  queue order, the access log and the 3-day alert.
- **Nothing here has an automated guard**, and it joins the list ADR-0025 opened and ADR-0026
  extended. Two items carry more than a usability cost: the equal-weight controls on the re-upload
  screen are D.1377 art. 6 compliance living in a component tree, and **the standing constraint on the
  vocabulary is enforced by nobody** — a seventh code whose imperative names the reader would reopen
  the channel decision silently.
- **A gap this ticket surfaced and does not own**: **no email of ours survives an erasure.** ADR-0021
  hard-deletes the `persons` row and ADR-0010 has an object-store adapter, but a sent message is
  outside every adapter. This is not a photo problem — ADR-0015's Offer notifications name a person
  and a pay figure, revealing considerably more than _"no se te ve la cara"_ — so it belongs to the
  notifications lane rather than here.

## Rejected

**An operator-convenience code list, translated afterwards.** The direction ADR-0010 implied, and the
one that produces the sentence this ADR exists to avoid.

**An operator-only layer of codes.** The person would be shown something other than what was decided
about them, and a copy-first vocabulary cannot survive one lie.

**`impersonation` and `underage` as photo codes.** Judgments about an account, already owned by
ADR-0013, and suppressing one image does nothing about either.

**The full diagnosis in the email.** Reaches the most people and leaves a proposition about somebody's
face in a channel we can never reach.

**A per-code channel policy.** Differential treatment leaks the thing it protects — the vague email
becomes the signal.

**No reason in the email at all.** Strictly safest, costs a hop, and the hop is where the Photo is
lost.

**Silence on approval.** Leaves the person who was promised three days with no way to learn the
answer.

**Silence on the missed three days.** Cannot be silent anyway, since the pending card has to stop
asserting something false.

**A new date when we miss the first one.** A second promise we might also miss.

**Escalating copy on a repeat**, and a visible count of refusals. Keeping score against a face, over a
Purpose that can never be required.

**A congratulation on approval.** There is no badge to earn.

**A dark frame, an alarm colour, or any warning mark on the refusal path.**
