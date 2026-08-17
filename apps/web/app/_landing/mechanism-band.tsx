import { Container } from "./container";

/**
 * ADR-0026's three mechanism facts, which replace `TrustProof`'s dead "Empresas verificadas".
 *
 * **The strings are fixed by that ADR and are not copy to tighten.** Two properties in particular:
 *
 * - This band appears on the landing page **and on no other surface**. A surface where somebody is
 *   being judged — a Wall card, a Public View, a search result, a suggestion — carries nothing,
 *   because there is nothing true to say about the person on it.
 * - **The second item's limit clause is load-bearing.** Dropping "Solo la foto: no comprobamos nada
 *   más de nadie" for length turns a true sentence into "Encuentra revisa a la gente", which is the
 *   exact claim ADR-0026 exists to retire. ADR-0026 names this as one of two things with no
 *   automated guard in v1.
 *
 * Nothing about payment appears here. The first item sets the free-to-use expectation and stops;
 * the money copy lives in the Offer, next to a figure someone is about to accept.
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
    <section className="bg-muted border-border border-b py-12">
      <Container>
        <ul className="grid gap-8 sm:grid-cols-3">
          {FACTS.map((fact) => (
            <li key={fact.lead} className="max-w-prose">
              <p className="font-heading font-semibold tracking-tight">{fact.lead}</p>
              <p className="text-muted-foreground mt-1 text-sm">{fact.rest}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
