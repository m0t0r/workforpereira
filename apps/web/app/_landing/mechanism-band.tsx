import { Container } from "./container";

/**
 * Three facts about the mechanism, directly under the header and above the Walls.
 *
 * **They are facts, not reassurance, and they sit first for that reason.** Somebody who has just
 * lost their income and landed on a site full of strangers has exactly three questions — _what does
 * this cost me_, _who is looking at my face_, and _who gets my number_ — and a strip that answers
 * them in one line each is cheaper to read than the trust page it replaces. Nothing here is a
 * promise about a person; every line is a description of what the software does.
 *
 * Two properties worth keeping:
 *
 * - This band appears on the landing page **and on no other surface**. A surface where somebody is
 *   being judged — a Wall row, a Public View, a search result, a suggestion — carries nothing,
 *   because there is nothing true to say about the person on it.
 * - **The second item's limit clause is load-bearing.** Dropping _"Solo la foto: no comprobamos
 *   nada más de nadie"_ for length turns a true sentence into _"Encuentra revisa a la gente"_,
 *   which is the exact claim `PRODUCT.md` holds as product truth in the other direction: nothing is
 *   verified about anybody, and copy may never imply otherwise. It survives ADR-0026 going back for
 *   rework, and it has no automated guard.
 *
 * Nothing about payment appears here. The first item sets the free-to-use expectation and stops;
 * the money copy lives in the Offer, next to a figure someone is about to accept.
 *
 * **Mobile shape.** At 390 the three columns become three rows, and each fact is one flowing
 * sentence pair rather than a lead with a paragraph under it — three stacked two-line blocks with
 * their own headings would push the Walls, which are the actual content, most of a screen down.
 * The lead keeps its weight, so the scan order survives the collapse.
 */
const FACTS = [
  {
    lead: "Usar Encuentra no cuesta nada.",
    rest: "Ni publicar, ni buscar, ni mandar una propuesta.",
  },
  {
    lead: "Una persona revisa cada foto.",
    rest: "Antes de que aparezca. Solo la foto: no comprobamos nada más de nadie.",
  },
  {
    lead: "El teléfono se comparte al aceptar.",
    rest: "Tú decides cuándo, propuesta por propuesta.",
  },
];

export function MechanismBand() {
  return (
    <section
      aria-label="Cómo funciona Encuentra, en tres datos"
      // The rule as well as the tint. `--muted` is a two-percent step off the page, which is enough
      // to read as a band when it has a boundary and not enough on its own — without the border the
      // first Wall's heading looks like it belongs to the strip above it.
      className="bg-muted border-border border-b"
    >
      <Container>
        <ul className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {FACTS.map((fact) => (
            <li key={fact.lead} className="py-3.5 sm:px-5 sm:py-5 sm:first:pl-0 sm:last:pr-0">
              <p className="text-sm text-pretty">
                <span className="font-heading font-semibold tracking-tight">{fact.lead}</span>{" "}
                <span className="text-muted-foreground">{fact.rest}</span>
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
