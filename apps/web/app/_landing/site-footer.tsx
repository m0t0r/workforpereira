import { Container } from "./container";

/**
 * Deliberately bare. The two documents that belong here — the _aviso de privacidad_ and the
 * _política de tratamiento_ (ADR-0007) — are versioned documents that do not exist yet, and a footer
 * link to a page that is not written is worse than no link. They land with the consent surface,
 * which is also when the law starts requiring them.
 */
export function SiteFooter() {
  return (
    <footer className="border-border bg-muted border-t py-10">
      <Container className="flex flex-col gap-1">
        <p className="font-heading font-bold tracking-tight">Encuentra</p>
        <p className="text-muted-foreground text-sm">Pereira y Risaralda, Colombia.</p>
      </Container>
    </footer>
  );
}
