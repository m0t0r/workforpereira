import Link from "next/link";

import { Button } from "@repo/design-system/components/button";

import { Container } from "./container";

/**
 * Centred copy, one focal point, no dashboard and no imagery — `packages/design-system/README.md`,
 * Layout. Heading tracking is re-derived here rather than inherited: the handoff's `-0.06em` was
 * tuned for Manrope, and Figtree at display sizes sits well at `tracking-tight` (-0.025em).
 *
 * Two things the copy is doing on purpose:
 *
 * - **It never promises work.** The line under the buttons is ADR-0026's, and it is the sentence
 *   every route out of a flow also ends on.
 * - **The second action needs no account.** ADR-0014 made Need search public precisely so "the
 *   person who lost their income can look for work with no account at all"; hiding it behind signup
 *   would spend the one honest thing this page can offer a visitor today.
 */
export function Hero() {
  return (
    <section className="border-border border-b py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-8 text-center">
        <h1 className="font-heading max-w-3xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] font-bold tracking-tight text-balance">
          Alguien sabe hacer lo que tú necesitas. Y alguien necesita lo que tú sabes hacer.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance">
          Encuentra pone en contacto a personas de Pereira y Risaralda con quien quiera pagarles por
          un trabajo, esté donde esté. Tú publicas lo tuyo, la otra persona te manda una propuesta,
          y de ahí en adelante hablan ustedes.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button render={<Link href="/signup" />} size="lg">
            Crear una cuenta
          </Button>
          <Button render={<Link href="/search/work" />} variant="outline" size="lg">
            Ver lo que la gente necesita
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Para ver y buscar lo que la gente necesita no hace falta cuenta.
        </p>
        <p className="max-w-xl font-medium text-balance">
          Encuentra no consigue trabajo por nadie. Te pone donde te pueden encontrar.
        </p>
      </Container>
    </section>
  );
}
