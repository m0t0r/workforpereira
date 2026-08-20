import Link from "next/link";

import { Container } from "../_landing/container";

/**
 * The frame every authentication screen sits in: a narrow card, centred, with the product name above
 * it and nothing else competing.
 *
 * Narrow on purpose. These screens are read on a phone by someone who may be doing this for the
 * first time, and `Container`'s 1180px is for a landing page with two columns of real content.
 */
export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Container className="max-w-[28rem] py-10 md:py-16">
      <p className="mb-8 text-center">
        <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
          Encuentra
        </Link>
      </p>

      <div className="bg-card border-border rounded-xl border p-6 md:p-8">
        <h1 className="font-heading mb-2 text-2xl leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {lede ? <p className="text-muted-foreground mb-6 text-[0.9375rem]">{lede}</p> : null}
        {children}
      </div>

      {footer ? (
        <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
      ) : null}
    </Container>
  );
}
