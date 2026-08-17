import Link from "next/link";

import { Button } from "@repo/design-system/components/button";

import { Container } from "./container";

/**
 * Centred copy, one focal point, no dashboard and no imagery — `packages/design-system/README.md`,
 * Layout. Heading tracking is re-derived here rather than inherited: the handoff's `-0.06em` was
 * tuned for Manrope, and Figtree at display sizes sits well at `tracking-tight` (-0.025em).
 *
 * Five things the copy is doing on purpose:
 *
 * - **The heading is reciprocity, not encouragement.** _"Lo que tú sabes hacer, a alguien le hace
 *   falta"_ centres the **other person's gap** rather than asserting the reader's worth. That
 *   distinction is the whole difference between this product and a charity: the design-system
 *   README fixes the proposition as _"income and agency, never charity"_, and a heading that tells
 *   somebody who has just lost their income that they are valuable is a motivational poster, which
 *   is the register that turns a user into a beneficiary. _Hacer falta_ rather than _necesitar_
 *   because it is warmer, more Colombian, and describes a hole on the hirer's side rather than a
 *   demand on the reader's.
 * - **The subheading makes the heading's _alguien_ concrete, and does nothing else.** It answers
 *   the only question the heading raises — _who?_ — with the true and surprising answer: a
 *   neighbour, or a stranger on another continent, and the platform cannot tell them apart.
 *   `CONTEXT.md`'s own one-line description is "anyone, anywhere", and that asymmetry — the worker
 *   is local, the hirer is not — is the whole shape of the product.
 *
 *   **It opens on a fact, not on a negation.** The previous version opened on three in a row — _no
 *   hay empresas_, _nadie está ganando plata_, _ni siquiera nosotros_ — which is precisely the
 *   variant ADR-0026 weighed and rejected: a band phrased as limits "loses on the one screen whose
 *   job is to make somebody stay", because "opening on three negatives to a person who has just
 *   lost their income is a worse first impression than opening on three facts". That rule is not
 *   specific to the band, and this sentence is under the same obligation.
 *
 *   **It does not restate the mechanism.** _Publicas → te mandan una propuesta → hablan ustedes_
 *   belongs to `HowItWorks`, which shows it against a drawn Offer. A prose flowchart in the hero is
 *   the same content rendered worse, and shipping both makes the weaker one read as filler.
 *
 *   **_Se entera de que existes_ is the honest verb.** Not that somebody hires you, not that work
 *   arrives — that they find out you are there, which is the only thing this platform actually
 *   does, and the same claim ADR-0026's line under the buttons makes in its own words. _Enterarse_
 *   is also the register `CONTEXT.md` asks for: what a neighbour says, not what an institution says.
 *
 *   **The non-profit fact moved to the footer**, where it is a fact about the operator among other
 *   facts about the operator rather than competing with the proposition. It is real and worth
 *   saying — no fees, no ads, no paid ranking, and no vacancy-first competitor can say it — but the
 *   hero belongs to the reader. See issue #95: nothing in the repo records it yet.
 *
 * - **Pereira is a municipality of Risaralda, not a place beside it.** _"Pereira y Risaralda"_ read
 *   as two locations; the department contains the city, and ADR-0014 already words the relationship
 *   correctly when it orders search results _"Pereira first, then the rest of Risaralda, then
 *   everywhere"_. The proposition is asymmetric in exactly that way — the worker is local, the
 *   hirer is anywhere — so the sentence has to carry both halves without flattening them.
 * - **It never promises work.** The line under the buttons is ADR-0026's, and it is the sentence
 *   every route out of a flow also ends on. Worth noting that it is the one string on this page
 *   still written in the older _findability_ register, and it is verbatim-fixed, so it stays.
 * - **The second action needs no account, and says so.** ADR-0014 made Need search public precisely
 *   so "the person who lost their income can look for work with no account at all"; hiding it
 *   behind signup would spend the one honest thing this page can offer a visitor today. The label
 *   names the absence of the account because that is the whole of the offer — _Ver lo que la gente
 *   necesita_ described the destination and left the reader to guess the price.
 */
export function Hero() {
  return (
    <section className="border-border border-b py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-8 text-center">
        <h1 className="font-heading max-w-3xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] font-bold tracking-tight text-balance">
          Lo que tú sabes hacer, a alguien le hace falta.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance">
          Ese alguien puede estar en tu barrio o en otro país. Aquí es donde se entera de que
          existes.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
            Crear una cuenta
          </Button>
          <Button
            render={<Link href="/search/work" />}
            nativeButton={false}
            variant="outline"
            size="lg"
          >
            Buscar trabajo sin cuenta
          </Button>
        </div>
        <p className="max-w-xl font-medium text-balance">
          Encuentra no consigue trabajo por nadie. Te pone donde te pueden encontrar.
        </p>
      </Container>
    </section>
  );
}
