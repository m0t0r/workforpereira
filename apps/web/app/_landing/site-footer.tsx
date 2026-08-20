import Link from "next/link";

import { Container } from "./container";
import { FOCUS_RING } from "./focus-ring";

/**
 * A utility footer, split by the only distinction that means anything on this product yet.
 *
 * **The columns are _with an account_ and _without one_, because that is the product's real seam.**
 * ADR-0014 opened Need search to people with no account deliberately — "the person who lost their
 * income can look for work with no account at all" — and everything else waits for a session. Any
 * other grouping (Producto, Empresa, Recursos) would be inventing a site that does not exist: there
 * are four routes, and three of them are here.
 *
 * **The legal links are here now, and #70 is why.** They were withheld while the _aviso de
 * privacidad_ and the _política de tratamiento_ (ADR-0007) were versioned documents with no page —
 * a footer link to a page that is not written is worse than no link. #70 built both routes and the
 * consent surface that points at them, which is also the moment the law starts requiring them, so
 * they take the row beside the place line that this shape always had room for.
 *
 * **Nothing from ADR-0026's mechanism band is repeated here.** _"Usar Encuentra no cuesta nada"_
 * would sit naturally in the bottom row and was drawn there, but the band is two screens up on the
 * same page — and ADR-0013 refused undifferentiated copy repeated until it stops being read.
 *
 * **The non-profit fact lives here rather than in the hero.** No fees, no ads, no paid ranking,
 * because nobody is extracting anything — true, and unavailable to every vacancy-first competitor.
 * It is still a fact about *us*: in the hero it displaced the proposition and opened the page on a
 * negation, and here it sits among the other things worth knowing about who runs this. ADR-0027
 * draws the line it has to respect — charity is permissible in the voice about the operator and
 * never in the voice about the reader, who is selling a skill for money. **Nothing in the repo
 * records the non-profit status yet: issue #95.**
 *
 * **_Pereira, Risaralda, Colombia_ — municipality, then department, the way a Colombian address is
 * written.** The old line read _"Pereira y Risaralda"_, which names one place twice and implies two:
 * Pereira is the capital of Risaralda and one of its fourteen municipalities.
 */
/**
 * Evaluated once when the module is first imported, which on a prerendered route is build time —
 * deliberately, not by accident. Calling `new Date()` **during render** is what `cacheComponents`
 * treats as a dynamic read: it would pull the footer, and with it the whole static shell, out of the
 * prerender for the sake of four digits. At module scope the year is baked into the build and
 * refreshes on every deploy, which is the same guarantee a hardcoded constant gives without the
 * annual bug.
 */
const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-border bg-muted border-t pt-12 pb-8">
      <Container className="flex flex-col gap-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="flex flex-col gap-2.5">
            <p className="font-heading text-xl font-bold tracking-tight">Encuentra</p>
            <p className="text-muted-foreground max-w-[34ch] text-sm text-pretty">
              Trabajo entre personas, en Pereira y los demás municipios de Risaralda. Nadie está
              ganando plata con esto, ni siquiera nosotros.
            </p>
          </div>

          <FooterColumn heading="Con cuenta">
            <FooterLink href="/signup">Crear una cuenta</FooterLink>
            <FooterLink href="/signin">Ingresar</FooterLink>
          </FooterColumn>

          <FooterColumn heading="Sin cuenta">
            <FooterLink href="/search/work">Buscar trabajo por habilidad</FooterLink>
          </FooterColumn>
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">Pereira, Risaralda, Colombia.</p>
          {/* A real list, for the same reason the columns above are: a screen reader announcing
              "list, 2 items" is what makes them navigable as a group. */}
          <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {/* `FooterLink` renders its own `<li>` — wrapping it in another nests them, which is
                invalid and makes the count a screen reader announces wrong. */}
            <FooterLink href="/legal/processing-policy">Política de tratamiento</FooterLink>
            <FooterLink href="/legal/privacy-notice">Aviso de privacidad</FooterLink>
          </ul>
          <p className="text-muted-foreground text-sm">© {YEAR} Encuentra</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-sm font-semibold tracking-tight">{heading}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

/**
 * A list item rather than a bare anchor: a screen reader announcing "list, 2 items" is what makes
 * the two columns navigable, and it is the same reason the headings are real `<h2>`s.
 */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className={`${FOCUS_RING} w-fit rounded-sm text-sm underline-offset-4 hover:underline`}
      >
        {children}
      </Link>
    </li>
  );
}
