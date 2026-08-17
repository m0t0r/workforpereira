import { Container } from "./container";

/**
 * _Cómo funciona_, between the Walls and the footer.
 *
 * **Nothing here is invented.** The two entrances are ADR-0025's two doors, the propuesta is
 * ADR-0015 — it states its own complete terms, is answerable yes or no, and is immutable once sent,
 * which is why there is no counter-offer — the simultaneous exchange of Contact Details is
 * ADR-0007, and public Need search with no account is ADR-0014.
 *
 * **The section is built around the Offer because the Offer is what the platform actually is.**
 * Encuentra carries exactly one structured object from one person to another and then stops; a row
 * of numbered steps describes that, and showing the object demonstrates it. Immutability and the
 * yes-or-no answer become obvious from the card instead of being asserted in prose.
 *
 * **The pay figure is deliberate, and it took an argument.** ADR-0026 says "nothing about payment
 * appears on the landing page", but what it *argues* is narrower — that the money **disclaimer**
 * belongs in the Offer next to a real figure rather than on a browsing surface, because disclaimers
 * read as danger. A sample amount on a diagram is not a disclaimer. The heavier objection was the
 * other one: `CONTEXT.md` keeps pay off a **Need** because a Need quoting pay and a schedule is a
 * _vacante_ in everything but name, and publishing _vacantes_ is the regulated activity
 * `docs/research/spe-authorisation.md` exists to ask counsel about. **An Offer is not a Need** — it
 * is private, addressed to one person, and nobody registers it — so an illustration of one is not
 * a published vacancy. See issue #94.
 *
 * **That argument depends entirely on the card reading as an example**, which is why the `Ejemplo`
 * label is not decoration and must not be dropped for tidiness: it is the difference between a
 * diagram and a posting.
 *
 * The figure itself is a plausible two-to-three-day rate for skilled work in Risaralda, and its
 * `Pago` row carries a **basis** (`por el trabajo`) because ADR-0015 requires one — per hour, day,
 * week, month or job. A bare amount would misrepresent the object as surely as no amount would.
 *
 * **This section takes the page ground, not `--muted`, and that is a constraint rather than a
 * preference.** The footer directly below it is `bg-muted`, so a muted section here produced two
 * adjacent tinted bands separated by a hairline and read as one region with a stray rule through
 * it. The page's tint rhythm is what separates sections — the mechanism band above is the tinted
 * one — so a second tint this close spends the signal. The rule is: **never place a `bg-muted`
 * block immediately against another**, which in practice means anything added between `HowItWorks`
 * and `SiteFooter` stays on the page ground too. The example Offer separates by border and
 * `shadow-xs`, which is what `bg-card` is for.
 */
export function HowItWorks() {
  return (
    <section className="border-border border-t border-b py-16 sm:py-20">
      <Container className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance">
              Todo pasa alrededor de una propuesta
            </h2>
            <p className="text-muted-foreground max-w-prose text-lg text-pretty">
              Es lo único que Encuentra lleva de una persona a otra.
            </p>
          </div>

          <ol className="flex flex-col gap-6">
            <Step n={1} lead="Alguien publica.">
              Lo que sabe hacer, o lo que necesita que le hagan. Las dos cosas se ven sin tener
              cuenta.
            </Step>
            <Step n={2} lead="La propuesta se manda entera.">
              Dice todo lo que hay que saber, se contesta sí o no, y no cambia después de mandada.
            </Step>
            <Step n={3} lead="Al aceptar se intercambian los números.">
              El tuyo y el suyo, al mismo tiempo. De ahí en adelante hablan ustedes, y por Encuentra
              no pasa plata.
            </Step>
          </ol>
        </div>

        <ExampleOffer />
      </Container>
    </section>
  );
}

function Step({ n, lead, children }: { n: number; lead: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        // Decorative: the `<ol>` already conveys the order to a screen reader, so reading "1" before
        // "Alguien publica" is the number twice.
        aria-hidden
        className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium"
      >
        {n}
      </span>
      <p className="text-pretty">
        <span className="font-medium">{lead}</span>{" "}
        <span className="text-muted-foreground">{children}</span>
      </p>
    </li>
  );
}

/**
 * A drawn Offer, not a component the product uses — the real one lives behind a session and does not
 * exist yet. It is markup rather than `NeedCard` on purpose: nothing here should drift when the real
 * Offer surface is built, and nothing built later should inherit this card's shape by accident.
 */
function ExampleOffer() {
  return (
    <figure className="bg-card border-border m-0 flex flex-col gap-5 rounded-lg border p-6 shadow-xs">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground text-xs tracking-wider uppercase">Propuesta</span>
        <span className="border-border text-muted-foreground rounded-sm border px-1.5 py-0.5 text-xs">
          Ejemplo
        </span>
      </figcaption>

      <p className="font-heading font-semibold tracking-tight">Pintar la fachada de la casa</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Pago</dt>
        {/* Tabular figures for money — `packages/design-system/README.md`, Typography. */}
        <dd className="m-0 font-medium tabular-nums">$400.000 por el trabajo</dd>
        <dt className="text-muted-foreground">Dedicación</dt>
        <dd className="m-0">Una vez</dd>
        <dt className="text-muted-foreground">Lugar</dt>
        <dd className="m-0">En la casa de quien contrata</dd>
        <dt className="text-muted-foreground">Municipio</dt>
        <dd className="m-0">Dosquebradas</dd>
      </dl>

      <div className="border-border flex gap-2 border-t pt-4">
        {/* Drawn, not `Button` — these answer nothing, and a real control here would be a lie about
            what the page can do. `aria-hidden` keeps them out of the tab order and the accessibility
            tree; the prose above already says the propuesta is answered yes or no. */}
        <span
          aria-hidden
          className="bg-primary text-primary-foreground flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Aceptar
        </span>
        <span
          aria-hidden
          className="border-border flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Rechazar
        </span>
      </div>
    </figure>
  );
}
