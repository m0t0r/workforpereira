import { ArrowRightIcon } from "lucide-react";

import { Button } from "@repo/design-system/components/button";

/**
 * Placeholder home page. It exists to prove the design system renders — Tailwind, the preset's
 * cyan-on-zinc variables, the Inter/Figtree pairing and a Base UI button — and carries no product
 * decisions. Replace it wholesale when the real surface is designed.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Work for Pereira</h1>
      <p className="text-muted-foreground text-balance">
        Encuentra trabajo cerca de ti. Todavía estamos construyendo esta página.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button>
          Empezar
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <Button variant="outline">Conoce más</Button>
        <Button variant="ghost">Ahora no</Button>
      </div>
    </main>
  );
}
