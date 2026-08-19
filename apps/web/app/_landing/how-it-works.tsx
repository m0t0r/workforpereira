import Link from "next/link";

import { Badge } from "@repo/design-system/components/badge";
import { Button } from "@repo/design-system/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/tabs";

import { Container } from "./container";
import { SkillList } from "./skill-list";

/**
 * _Cómo funciona_, between the Walls and the footer, told **twice** — once to each reader.
 *
 * **The two tellings are the reason this section exists in this shape.** One neutral description of
 * the mechanism has to be written from somewhere, and wherever it is written from, the other reader
 * becomes the object of the sentence: _"alguien te encuentra"_ and _"buscas quién puede hacerlo"_
 * are the same step, and a page that only says one of them has quietly decided whose page it is.
 * `PRODUCT.md`'s fourth principle refuses that, so the step list is switched rather than merged.
 *
 * **It is `Tabs`, not a toggle group.** Two panels of content with one visible is what a tablist is
 * for: the roles, the arrow-key navigation and the `aria-controls` wiring come with the primitive,
 * and there is no live region to get wrong because a tabpanel change is already announced. A pair
 * of `aria-pressed` buttons swapping a `<div>` would have to reproduce all of that by hand.
 *
 * The panels are rendered on the server and handed to the client boundary as children, so the whole
 * of this copy stays out of the JavaScript bundle — `Tabs` ships, the four steps do not.
 *
 * **Nothing in the content is invented.** The two entrances are ADR-0025's two doors, the propuesta
 * is ADR-0015 — it states its own complete terms, is answerable yes or no, and is immutable once
 * sent, which is why there is no counter-offer — the simultaneous exchange of Contact Details is
 * ADR-0007, and public Need search with no account is ADR-0014.
 *
 * **The section is built around drawn objects because the objects are what the platform is.**
 * Encuentra carries exactly one structured thing from one person to another and then stops; a row
 * of numbered steps describes that, and showing the thing demonstrates it. Immutability and the
 * yes-or-no answer become obvious from the card instead of being asserted in prose.
 *
 * **No drawn object contains a person.** No name, no face, no sentence in an invented person's
 * voice — `PRODUCT.md` allows fictional person data only inside a prototype clearly marked as one,
 * and this is the product. The Perfil object therefore shows the Skills, which are vocabulary terms
 * belonging to nobody, and *names* the Self-description field rather than filling it in.
 *
 * **The pay figure is deliberate, and it took an argument.** ADR-0026 said "nothing about payment
 * appears on the landing page", but what it *argued* is narrower — that the money **disclaimer**
 * belongs in the Offer next to a real figure rather than on a browsing surface, because disclaimers
 * read as danger. A sample amount on a diagram is not a disclaimer. The heavier objection was the
 * other one: `CONTEXT.md` keeps pay off a **Need** because a Need quoting pay and a schedule is a
 * _vacante_ in everything but name, and publishing _vacantes_ is the regulated activity
 * `docs/research/spe-authorisation.md` exists to ask counsel about. **An Offer is not a Need** — it
 * is private, addressed to one person, and nobody registers it — so an illustration of one is not a
 * published vacancy. See issue #94.
 *
 * **That argument depends entirely on the card reading as an example**, which is why the `Ejemplo`
 * badge is not decoration and must not be dropped for tidiness: it is the difference between a
 * diagram and a posting. The figure itself is a plausible two-to-three-day rate for skilled work in
 * Risaralda, and its `Pago` row carries a **basis** (`por el trabajo`) because ADR-0015 requires one
 * — per hour, day, week, month or job. A bare amount would misrepresent the object as surely as no
 * amount would.
 *
 * **This section takes the page ground, not `--muted`, and that is a constraint rather than a
 * preference.** The footer directly below it is `bg-muted`, so a muted section here produces two
 * adjacent tinted bands separated by a hairline and reads as one region with a stray rule through
 * it. The page's tint rhythm is what separates sections — the mechanism band at the top is the
 * tinted one — so a second tint this close spends the signal. The rule is: **never place a
 * `bg-muted` block immediately against another**, which in practice means anything added between
 * `HowItWorks` and `SiteFooter` stays on the page ground too.
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="border-border border-t py-14 sm:py-20">
      <Container className="flex flex-col gap-8">
        <h2
          id="how-it-works"
          className="font-heading text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.12] font-bold tracking-tight"
        >
          Cómo funciona
        </h2>

        <Tabs defaultValue="worker" className="gap-8">
          {/* Full width and stacked at 390: the two labels are whole clauses, and squeezing them
              into two 165px columns costs three wrapped lines apiece. Three overrides, each undoing
              an assumption the primitive makes about one-word tab labels:
              `group-data-horizontal/tabs:h-auto` beats its `h-9` — which is on the same variant, so
              a bare `h-auto` does not replace it and the second trigger overflows the pill entirely
              — `h-auto` on the trigger beats `h-[calc(100%-1px)]`, and `whitespace-normal` beats
              `nowrap`. */}
          <TabsList className="grid w-full grid-cols-1 gap-1 group-data-horizontal/tabs:h-auto sm:w-fit sm:grid-cols-2">
            <TabsTrigger value="worker" className="h-auto py-2 whitespace-normal">
              Si sabes hacer algo
            </TabsTrigger>
            <TabsTrigger value="hirer" className="h-auto py-2 whitespace-normal">
              Si necesitas que te hagan algo
            </TabsTrigger>
          </TabsList>

          {VARIANTS.map((variant) => (
            <TabsContent key={variant.value} value={variant.value} className="text-base">
              <Variant variant={variant} />
            </TabsContent>
          ))}
        </Tabs>
      </Container>
    </section>
  );
}

function Variant({ variant }: { variant: HowItWorksVariant }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-2xl font-bold tracking-tight text-balance">
          {variant.heading}
        </h3>
        <p className="text-muted-foreground max-w-prose text-pretty">{variant.blurb}</p>
      </div>

      <ol className="flex flex-col">
        {variant.steps.map((step, index) => (
          <li
            key={step.lead}
            // The object column is capped rather than `1fr`. At 1440 an even split gives the card
            // ~700px, and every one of these objects is a label/value list — which at that width
            // parks the label at the far left and its value at the far right with a quarter of the
            // screen of nothing between them. A card is legible at a card's width; the space the
            // cap frees goes to the prose, which can use it.
            className="border-border grid grid-cols-[2rem_1fr] items-start gap-x-4 gap-y-5 border-b py-7 last:border-b-0 last:pb-0 lg:grid-cols-[2rem_1fr_minmax(0,26rem)] lg:gap-x-10"
          >
            <span
              // Decorative: the `<ol>` already conveys the order to a screen reader, so reading
              // "1" before "Cuentas qué sabes hacer" is the number twice.
              aria-hidden
              className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium"
            >
              {index + 1}
            </span>

            <div className="flex flex-col gap-1.5">
              <h4 className="font-heading text-lg font-semibold tracking-tight text-balance">
                {step.lead}
              </h4>
              <p className="text-muted-foreground max-w-prose text-pretty">{step.body}</p>
            </div>

            {/* Below `lg` the object sits under the prose it illustrates and aligns with it, not
                with the numbered gutter — indenting a card to the text column is what keeps the
                step reading as one block instead of two. */}
            <div className="col-start-2 lg:col-start-3 lg:row-start-1">{step.object}</div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-start gap-3">
        <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
          {variant.cta}
        </Button>
        <p className="text-muted-foreground max-w-prose text-sm text-pretty">{variant.ctaNote}</p>
      </div>
    </div>
  );
}

/**
 * A drawn object, not a component the product uses — the real ones live behind a session and do not
 * exist yet. They are markup rather than `NeedCard` on purpose: nothing here should drift when the
 * real surfaces are built, and nothing built later should inherit these shapes by accident.
 */
function DrawnObject({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Badge variant="outline">Ejemplo</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

type Row = { label: string; value: string };

/** A label/value row, the shape every one of these objects states its terms in. */
function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-border flex flex-col divide-y">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2 first:pt-0">
          <dt className="text-muted-foreground text-sm">{label}</dt>
          {/* Tabular figures for money — `packages/design-system/README.md`, Typography. */}
          <dd className="m-0 text-right text-sm font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const PROFILE_OBJECT = (
  <DrawnObject title="Perfil">
    <SkillList skills={["Cocina para eventos", "Repostería"]} />
    <p className="text-muted-foreground text-sm text-pretty">
      Y algo escrito por ti, con tus palabras. No hay hoja de vida, ni años de experiencia, ni
      papeles.
    </p>
  </DrawnObject>
);

const NEED_OBJECT = (
  <DrawnObject title="Necesidad">
    <p className="font-medium text-pretty">Alguien que cocine para un grado</p>
    <SkillList skills={["Cocina para eventos"]} />
    <Rows
      rows={[
        { label: "Dedicación", value: "Una vez" },
        { label: "Lugar", value: "En la casa de quien contrata" },
        { label: "Municipio", value: "Pereira" },
      ]}
    />
    <p className="text-muted-foreground text-sm text-pretty">
      El pago no va aquí. Va después, en la propuesta.
    </p>
  </DrawnObject>
);

const SEARCH_OBJECT = (
  <DrawnObject title="Búsqueda">
    {/* The Skill and the place are two different things and are drawn as two, not as two chips in
        one row: a Municipality is never a Skill, and a picture that suggests otherwise is the first
        step towards a vocabulary that has places in it (ADR-0012). */}
    <SkillList skills={["Cocina para eventos"]} />
    <Rows rows={[{ label: "Municipio", value: "Pereira" }]} />
    <p className="text-muted-foreground text-sm text-pretty">
      No se filtra por experiencia ni por títulos. Solo por lo que la gente dijo que sabe hacer.
    </p>
  </DrawnObject>
);

const OFFER_OBJECT = (
  <DrawnObject title="Propuesta">
    <p className="font-medium text-pretty">Cocinar para un grado de veinte personas</p>
    <Rows
      rows={[
        { label: "Pago", value: "$450.000 por el trabajo" },
        { label: "Dedicación", value: "Una vez" },
        { label: "Lugar", value: "En la casa de quien contrata" },
        { label: "Municipio", value: "Pereira" },
      ]}
    />
  </DrawnObject>
);

const ANSWER_OBJECT = (
  <DrawnObject title="Respuesta">
    {/* Drawn, not `Button` — these answer nothing, and a real control here would be a lie about what
        the page can do. `aria-hidden` keeps them out of the tab order and the accessibility tree;
        the line below already says the propuesta is answered yes or no.

        The two are the same size and the same shape, and the refusal is not a ghost. ADR-0025 bans
        a filled primary beside a ghosted escape on a consent surface; an Offer answer is not one,
        but this picture is what the real control will be built to look like, and a diagram that
        draws _no_ as the quieter option is where that asymmetry gets in. */}
    <div aria-hidden className="flex flex-wrap gap-2">
      <span className="bg-primary text-primary-foreground flex h-9 items-center rounded-md px-4 text-sm font-medium">
        Aceptar
      </span>
      {/* `border-border`, not `border-input`. The two are deliberately different values with
          different jobs — `--input` is the 3:1 boundary that identifies a form control, and this is
          a drawing of `Button`'s `outline` variant, which uses `--border`. */}
      <span className="border-border flex h-9 items-center rounded-md border px-4 text-sm font-medium">
        No, gracias
      </span>
    </div>
    <p className="text-muted-foreground text-sm text-pretty">
      Al aceptar, cada una ve el número de la otra. Antes de eso, no.
    </p>
  </DrawnObject>
);

type HowItWorksVariant = {
  value: "worker" | "hirer";
  heading: string;
  blurb: string;
  steps: { lead: string; body: string; object: React.ReactNode }[];
  cta: string;
  ctaNote: string;
};

const VARIANTS: HowItWorksVariant[] = [
  {
    value: "worker",
    heading: "Así te van a encontrar.",
    blurb:
      "Cuatro pasos. No pagas nada, no compites contra nadie y no tienes que conseguir papeles.",
    steps: [
      {
        lead: "Cuentas qué sabes hacer.",
        body: "Escoges de una lista las cosas que puedes hacer. No es lo que fuiste contratado para hacer alguna vez: es lo que harías mañana.",
        object: PROFILE_OBJECT,
      },
      {
        lead: "Alguien te encuentra.",
        body: "Buscando por lo que necesita que le hagan. Puede estar en Dosquebradas o en Madrid; para ti es el mismo trabajo.",
        object: SEARCH_OBJECT,
      },
      {
        lead: "Te llega una propuesta entera.",
        body: "Qué es, cuánto pagan, dónde y por cuánto tiempo. Todo eso lo ves antes de contestar, y no cambia después.",
        object: OFFER_OBJECT,
      },
      {
        lead: "Dices que sí, y se pasan el teléfono.",
        body: "Ahí termina lo nuestro. De ahí en adelante hablas tú con esa persona, y por Encuentra no pasa plata.",
        object: ANSWER_OBJECT,
      },
    ],
    cta: "Cuenta lo que sabes hacer",
    // The one sentence on this page still written in the older findability register, and it is the
    // sentence every route out of every flow ends on: `PRODUCT.md` binds the product to never imply
    // a guarantee of employment, and this is where that promise is kept out loud.
    ctaNote:
      "Es gratis, y puedes quitarlo cuando quieras. Encuentra no consigue trabajo por nadie: te pone donde te pueden encontrar.",
  },
  {
    value: "hirer",
    heading: "Así vas a encontrar a alguien.",
    blurb:
      "Cuatro pasos. No hay comisión, el dinero no pasa por aquí y no tienes que publicar una vacante.",
    steps: [
      {
        lead: "Escribes lo que necesitas.",
        body: "Qué hay que hacer, dónde y si se acaba o no. No tienes que redactar una vacante ni pedir hoja de vida.",
        object: NEED_OBJECT,
      },
      {
        lead: "Buscas quién puede hacerlo.",
        body: "Por lo que necesitas, no por títulos. También te aparece gente sola, según lo que escribiste.",
        // The Perfil, not the Búsqueda — this is the step where the two tellings have to differ.
        // Step 2 is the same event seen from opposite sides: the worker is *found*, so what the
        // step shows them is the query somebody typed; the hirer *searches*, so what the step
        // shows them is what comes back. Pairing both with the query would put the identical
        // object under both tabs and quietly undo the reason the section is told twice.
        object: PROFILE_OBJECT,
      },
      {
        lead: "Le mandas una propuesta entera.",
        body: "Con el pago adentro. Se manda completa para que la otra persona no tenga que adivinar nada, y se contesta sí o no.",
        object: OFFER_OBJECT,
      },
      {
        lead: "Acepta, y se pasan el teléfono.",
        body: "Ahí termina lo nuestro. El pago y el resto lo arreglan ustedes dos, directamente.",
        object: ANSWER_OBJECT,
      },
    ],
    cta: "Cuenta lo que necesitas",
    ctaNote: "Es gratis. No cobramos comisión por nada, y por Encuentra no pasa plata.",
  },
];
