import Link from "next/link";

import { Button } from "@repo/design-system/components/button";

import { Container } from "./container";

/**
 * Wordmark and the primary action, which is all the header carries at 390 and all it carries
 * anywhere — there is no navigation to move into a menu. `Logo` in the audited component inventory
 * is "text wordmark and a simple mark", and **no brand mark exists**, so this is type only.
 */
export function SiteHeader() {
  return (
    <header className="border-border border-b">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-heading focus-visible:outline-ring rounded-sm text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Encuentra
        </Link>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/signin" />} variant="ghost" size="lg">
            Ingresar
          </Button>
          <Button render={<Link href="/signup" />} size="lg">
            Crear una cuenta
          </Button>
        </div>
      </Container>
    </header>
  );
}
