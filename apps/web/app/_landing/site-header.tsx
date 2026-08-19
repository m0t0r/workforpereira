import Link from "next/link";

import { Button } from "@repo/design-system/components/button";

import { Container } from "./container";
import { FOCUS_RING } from "./focus-ring";

/**
 * Wordmark, a way back in, and the primary action. The accessibility bar's 390 rule — keep the
 * wordmark and the primary action, move navigation into a menu — has nothing to move: there is no
 * navigation, because there is nowhere else to go. What is left has to fit instead, which is why
 * the label here is the short _Crear cuenta_ and the Walls' are the long ones: at 390 the row is
 * roughly 280px inside a 342px content box, and the buttons are `whitespace-nowrap`, so a label
 * that outgrows the row overflows rather than wraps.
 *
 * `Logo` in the audited component inventory is "text wordmark and a simple mark", and **no brand
 * mark exists**, so this is type only.
 */
export function SiteHeader() {
  return (
    <header className="border-border border-b">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className={`${FOCUS_RING} font-heading rounded-sm text-lg font-bold tracking-tight`}
        >
          Encuentra
        </Link>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/signin" />} nativeButton={false} variant="ghost" size="lg">
            Ingresar
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
            Crear cuenta
          </Button>
        </div>
      </Container>
    </header>
  );
}
