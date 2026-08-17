import type { Metadata } from "next";
import { Figtree, Geist_Mono, Inter } from "next/font/google";

import "@repo/design-system/globals.css";

import { cn } from "@repo/design-system/lib/utils";

// Inter for body, Figtree for headings, Geist Mono for monospace — kept by ADR-0029, which
// records the pairing as a decision rather than an inheritance. `globals.css` maps the first two
// onto Tailwind through `--font-sans` and `--font-heading`; `font-mono` resolves `--font-mono`
// from Tailwind's own theme, which the variable below overrides. `next/font/google` self-hosts
// all three at build time — the browser never reaches Google.
const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontHeading = Figtree({ subsets: ["latin"], variable: "--font-heading" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

// The product is called Encuentra; `workforpereira` is the repository. A `<title>` is read by a
// person, so it is Spanish and it is the product's name (ADR-0001). The description states the
// mechanism and stops — nothing the product says may imply a guarantee of employment (ADR-0026).
export const metadata: Metadata = {
  title: "Encuentra",
  description:
    "Encuentra pone en contacto a personas de Pereira y Risaralda con quien quiera pagarles por un trabajo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang="es"` because the product is Spanish-only (ADR-0001). No `suppressHydrationWarning`:
    // it existed for next-themes, which ADR-0029 removed along with dark mode, and leaving it
    // would silence real hydration mismatches for free.
    <html
      lang="es"
      className={cn(
        "antialiased font-sans",
        fontSans.variable,
        fontHeading.variable,
        fontMono.variable,
      )}
    >
      <body>{children}</body>
    </html>
  );
}
