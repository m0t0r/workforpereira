# The first run asks which door you came through, and ends on a limit rather than a promise

Between the credential and a Publication there are four screens and one question the product has
never asked: **why are you here?** It asks it first, before anything else, because every screen after
it is written for one of two people and there is no copy that serves both.

The stretch this decides was never designed on purpose. It fell out of five other ADRs — ADR-0009's
long signup, ADR-0012's minimum of 1, ADR-0016's suggestions-as-home, ADR-0023's picker, ADR-0010's
Photo — each correct on its own and none of them looking at what a person meets in sequence. Prototyped
at `docs/design/first-run-prototype/` on `prototype/first-run`, three ways.

## The fork is the first screen

**_"Hola, {nombre}. ¿A qué vienes?"_** and two cards: **Busco trabajo** · **Necesito contratar a
alguien**. Underneath, one line: _"Puedes hacer las dos cosas. Empieza por una y la otra queda para
cuando quieras."_

Not a third card. A person who arrives wanting both is real and rare, and giving them a card of their
own makes the rarest case as loud as the two common ones on the screen that has to be understood
fastest.

**The alternative was no fork at all**, and it is the one this ADR spent the longest refusing.
Assuming the worker is defensible — ADR-0016 established the corpus is _asymmetric_, workers are the
supply, and the audience this product exists for is the side offering labour. A prototype variant
built it: the hirer's door was a line of small text under the hero, _"¿Vienes a contratar a alguien?"_

It loses on **who pays for the assumption**. The hirer meets a screen written for somebody else and is
rescued by the smallest type on it — and the hirer is the side with money, which is precisely the side
ADR-0016 named as the launch risk when it found the worker-facing corpus is the empty one. Taxing the
scarce side to save the abundant side one tap is the wrong way round.

**The other alternative was no funnel at all** — put the picker inside ADR-0016's home and let the
coincidencias fill in underneath as Skills are chosen, so the empty home is met rather than dodged.
This was the strongest losing variant and it is worth saying why it lost, because it did not lose on
its merits: **it assumes the worker exactly as the first alternative does.** Its home is written for
one role. Putting the fork in front of it turns it into this ADR with a different second screen, and
the thing it uniquely buys — learning where the home lives — is bought anyway thirty seconds later,
because the home is where publishing lands you.

**The cost of the fork is real and is not hidden**: it is one more screen in front of a product
nobody has seen yet, on top of ADR-0009's form, which #14 already flagged as _a lot of screen before
anyone has seen the product_. This ADR adds to that count deliberately and buys divergence with it.

## The order is fork, skills, foto, dónde, publicado

One screen at a time, a breadcrumb across the top, and a **Continue** on each. ADR-0023's picker is
the second screen unchanged — one search box over Skills and Denominations, the bundle adding to the
tray, the meter marking the floor at 1, the Skill Suggestion always present.

The last screen is **dónde**, and its button is the one that publishes. That placement is load-bearing
and the next two sections are why.

## The Municipality lands here, because nothing else collects it

`CONTEXT.md`: _"Every Publication has one."_ ADR-0014 indexes on Skill **and** place. ADR-0009's signup
form asks for a full name, a date of birth and four consent boxes and **stops** — no location, on
purpose, because it was designing consent evidence rather than a Publication.

So the Municipality arrives in the first run by elimination rather than by choice, and it is the only
field here that is neither a Skill nor optional. It is asked as _"¿Dónde estás?"_ for a Capability
Profile and _"¿Dónde es el trabajo?"_ for a Need — the same column, a different owner — alongside the
Publication's remote flag as a checkbox.

The worker's screen carries one sentence that exists because a person would otherwise assume the
opposite: **_"En tu perfil público solo se ve el departamento, nunca el municipio."_** That is ADR-0011's
public tier, said out loud at the moment the data is collected rather than buried in an _aviso_.

**What is deliberately not said** is the equivalent sentence for a Need. Whether a publicly searchable
Need exposes its exact Municipality is genuinely undecided — ADR-0011's table draws that line for a
_Person_, and ADR-0014 later made Needs public without revisiting it. The copy says only what the
field is for. **#10 owns closing this**, and until it does, no screen may claim either answer.

## The Photo sits inside the flow, and never at the end of it

Third screen, between the picker and the Municipality. It is the placement that gets the most Photos,
and a Capability Profile with a face reads differently to a hirer than one without — asking after
publishing means most people never come back to it.

**That placement is only lawful because of where it is not.** ADR-0010 makes the Photo the one Purpose
that can **never** be required by anything, and D.1377 art. 6 bans conditioning an activity on the
supply of sensitive data. A step inside the flow is one hierarchy mistake away from being that
condition, so three properties are decided here rather than left to implementation:

1. **The Photo screen is never the last screen before publishing.** _dónde_ is, and its button says
   _"Publicar mi perfil"_. If the Photo were last, _"Poner una foto"_ would be the button you press to
   publish, and the ban would be broken by the running order alone.
2. **Its two controls carry equal visual weight** — two outlined buttons, _"Poner una foto"_ and
   _"Ahora no"_, neither of them filled. A filled primary next to a ghosted escape is a recommended
   answer, and a recommended answer to a question the law says may not be required is that same
   conditioning arriving through CSS instead of through a rule.
3. **It states the cost of skipping, which is nothing**: _"Saltar este paso no cambia nada: ni tu
   perfil, ni lo que la gente ve, ni el orden en que sales."_ The last clause is the one that matters —
   it forecloses the suspicion that a face ranks better, which ADR-0014 makes false and nobody would
   otherwise believe.

The screen also carries ADR-0010's three D.1377 art. 6 duties in plain Spanish — that a face is data
the law protects specially, that there is no obligation to supply it, and what it is for — plus the
fact nothing else states: **it is invisible for up to 3 days while a human reviews it, and nothing
else waits.** The Publication publishes, matches and receives Offers meanwhile.

## Stopping halfway is a state with a name

ADR-0012's minimum of 1 makes _saved but unreachable_ a real place to be, and someone on a borrowed
phone or a rationed data plan will end up there.

**It is an explicit draft.** Every screen in the flow carries **_"Guardar y seguir después"_**, and the
home then carries one card:

> **Tu perfil está guardado, sin publicar.**
> Nadie te puede encontrar mientras esté sin publicar.
> **[ Terminar y publicar ]**

**_Sin publicar_ is the Spanish for the Publication's unpublished state**, in this card and everywhere
after it.

Three things about that copy are decisions:

- **It states a fact, and the fact is bad news.** Nobody can find you. The alternative — a softer
  line about progress — would be the only sentence in the product that misleads, and it would mislead
  the person with the most at stake.
- **It offers exactly one action**, and never counts what is missing. No _completa tu perfil_, no
  percentage, no list of remaining steps. ADR-0023 set that rule for the meter; it binds harder here,
  because this is the screen a person sees when they already know they did not finish.
- **It does not escalate.** The card is the same on the second visit as on the first. A message that
  grows more insistent is pressure applied to someone who is not avoiding the task, they are surviving
  a week.

**Saving silently was rejected**, though it tests better: it produces the same card without anyone
ever having chosen to stop. Being invisible should be a thing you did, not a thing that happened to
you. **Losing the work was rejected** without argument.

**This is also where ADR-0016's empty home actually gets met.** The chosen flow reaches the home only
after publishing, so in the happy path the empty suggestions surface never renders — it is _dodged_,
and this ADR says so plainly rather than claiming to have solved it. The parked state is the one route
to that surface, and the card above is what stands on it.

## The end states the limit

The last screen is not a celebration.

> **Ya te pueden encontrar. Eso no es lo mismo que te encuentren.**
>
> Tu perfil ya sale en las búsquedas. Que alguien te escriba depende de que alguien esté buscando lo
> que tú haces — y eso no lo decidimos nosotros.

Then two blocks: **_Dónde estás ahora_** — in search from this moment, on the Wall by rotation,
because ADR-0011's Wall is _"a bounded, rotating sample and never an index"_ and a person will
otherwise read _publicado_ as _en la portada_ — and **_Lo que sí puedes hacer hoy_**, which for a
worker is to search the published Needs and write first. Every route out of the flow ends on the same
line: **_"Encuentra no consigue trabajo por nadie. Te pone donde te pueden encontrar."_**

**This is against the grain on purpose.** The usual rule is that a flow ends on a clear success state,
and a plain confirmation was built and tested. It loses because _"ya te pueden encontrar"_ is heard as
_algo va a pasar_ by someone who needs something to happen, and the gap between that and ADR-0015's
_the platform stops at the introduction_ is where the product would break the map's oldest rule: never
imply it will find you work. **The one moment expectations can be set is this screen, and skipping it
entirely — publishing straight into the coincidencias — spends it.**

Peak-end says finish strong. This finishes true, and the strength is moved into the second block:
the person leaves holding an action they can take today without waiting for anyone.

## The Need path is not the mirror image

#30 handed the Need's picker here, and the asymmetry is sharper than a different cap.

|                   | Capability Profile                  | Need                                    |
| ----------------- | ----------------------------------- | --------------------------------------- |
| Skills            | max **20** (ADR-0012)               | max **5** (ADR-0016)                    |
| Opening question  | _¿Qué sabes hacer?_                 | _¿Qué necesitas que te hagan?_          |
| Note at exactly 1 | _"en más búsquedas vas a aparecer"_ | _"mejores personas te vamos a mostrar"_ |
| Self-description  | **not asked in the first run**      | **asked** — _Cuenta qué hay que hacer_  |
| Photo             | offered                             | not offered                             |
| Publishes on      | _dónde_                             | _descripción_                           |

**The Self-description split is the whole of it, and it falls out of an existing decision rather than
out of taste.** `CONTEXT.md` makes it _"never searched, never filtered, and never an input to
matching"_. For a worker that means free prose buys **no findability at all** — it is the hardest
thing on the screen to write, it is written by someone who has just been asked to account for
themselves, and it does nothing. It is out. For a Need it is what a worker reads before deciding
whether to answer, so it is the screen that publishes.

**The Need's screen says what does not go in it**: _"El pago y las condiciones no van aquí: los pones
en la oferta que le mandas a alguien."_ ADR-0015 puts terms in the Offer, and nothing had forbidden a
Need from restating them — but a Need quoting a rate and a schedule is a _vacante_ in everything but
name, which is the object UAESPE **Res. 000129 art. 5** reaches and the exposure ADR-0011 accepted
knowingly and narrowly. Keeping pay out of the Need keeps that exposure where it was.

**The Photo is not offered to a hirer in the first run.** It belongs to the Person either way and
remains available from the profile; nothing in publishing a Need is improved by a face, and ADR-0010's
argument is against asking casually.

## No copy agrees in gender with the reader

**_"Listo. Tu perfil ya está publicado."_** — never _"Ya estás publicada."_

Gender is not collected, and ADR-0009 settled that the name is authored rather than taken from a
provider profile, so there is nothing to infer from either. The rule is mechanical: **the adjective
agrees with the object, never with the person.** Where no object is available the sentence is rewritten
until one is, which is how _"Publicada no es lo mismo que vista"_ became _"Ya te pueden encontrar. Eso
no es lo mismo que te encuentren."_

This is not a style preference and it is not about inclusive orthography — `@`, `x` and `e` endings are
all refused, because they read as a political register in a product whose whole voice problem is
sounding like a neighbour rather than an institution. It is simply that the product does not know, and
guessing wrong in the second sentence someone reads is a worse failure than a slightly longer sentence.
`CONTEXT.md` carries it beside the address rule.

## What this binds

- **ADR-0009 extended, not amended.** Its form is unchanged. What follows it is now decided, and the
  Municipality it declines to collect is collected on the fourth screen of this flow.
- **ADR-0016 is dodged rather than satisfied, and this is recorded as a debt.** The signed-in home is
  reached after publishing, so its empty state renders only for a parked Person. If the flow is ever
  made skippable, that surface becomes load-bearing and needs its own decision.
- **ADR-0010 gains three structural constraints** — never the last pre-publish screen, equal-weight
  controls, and the stated cost of skipping. They are properties of any screen that offers the Photo,
  not of this flow only.
- **ADR-0023 is inherited whole.** The picker, its meter, its cap treatment, its Suggestion and its
  near-empty states appear here unchanged; nothing in this ADR reopens them.
- **`CONTEXT.md`** gains the **gender-agreement rule** beside the address rule, and **_sin publicar_**
  as the Spanish for a Publication's unpublished state.
- **#10 owns** whether a publicly searchable Need exposes its exact Municipality. Undecided, named
  here, and no screen may claim either answer until it is.
- **#12 inherits** the fork's two cards as the first surface anyone sees signed-in, and the rule that
  a profile without a Photo never renders second-class.
- **#16 inherits nothing testable.** Every decision here is a screen, a string or an ordering, and
  ADR-0017 puts all of it outside the two seams — see below.

## What has no automated guard

The running order that keeps the Photo off the publish button is a **property of a React component
tree**, and ADR-0017 tests neither components nor browsers in v1. Neither does anything else here: the
equal-weight controls, the parked card's copy, the gender rule, the ending that refuses to celebrate.

The map already carries the consent-evidence path and ADR-0023's picker as guarded by prose alone.
**This ADR adds the first run to that list**, and its Photo ordering is the item on it with a
regulatory edge rather than a usability one — a refactor that moves one array element publishes people
through a screen the law says may not condition anything. It is named here so that the first browser
test written, whenever v1 is standing, has a reason to cover it.

## Rejected

**No fork — assume the worker.** Argued above: it taxes the scarce side of a market whose scarcity is
the launch risk.

**No funnel — the picker lives in the home.** The strongest loser. It meets ADR-0016's empty home
honestly, and it still assumes the worker; adding the fork to it produces this ADR.

**A third fork card for _"las dos cosas"_.** Makes the rarest case as loud as the two common ones on
the screen that must be understood fastest. It is a line of text instead.

**A completion meter over the whole first run.** ADR-0023 already refused to score completeness for
Skills; scoring it across screens is the same mistake with a wider denominator, and it turns _"I have
not uploaded a face"_ into a deficit.

**Asking the Photo first, before the picker.** Most personal ask, in front of the thing the person came
to do, to someone who has just lost their income.

**Saving silently instead of an explicit draft.** Produces the same card with nobody having chosen it.

**Publishing straight into the coincidencias with no ending screen.** Fastest to the payoff, and it
spends the only moment in the product where expectations can be set honestly.

**Asking a worker for a Self-description in the first run.** It is never searched, so it costs the most
and buys the least, at the moment a person has the least to spend.

**Asking which door at signup instead**, as a fifth field on ADR-0009's form. Consent evidence and
product intent are different questions with different retention consequences, and ADR-0007's form is
already the longest screen in the product.
