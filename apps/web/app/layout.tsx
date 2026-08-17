import type { Metadata } from "next";
import { Figtree, Geist_Mono, Inter } from "next/font/google";

import "@repo/design-system/globals.css";

import { cn } from "@repo/design-system/lib/utils";

import { ThemeProvider } from "@/components/theme-provider";

// The preset (b1Jnytspg8) names Inter for body and Figtree for headings; `globals.css` maps both
// onto Tailwind through `--font-sans` and `--font-heading`. Geist Mono stays for monospace, which
// the preset does not speak to. `next/font/google` self-hosts these at build time — the browser
// never reaches Google — so this replaces the local Geist `.woff` files rather than adding a
// third-party request.
const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontHeading = Figtree({ subsets: ["latin"], variable: "--font-heading" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Work for Pereira",
  description: "Encuentra trabajo en Pereira.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang="es"` because the product is Spanish-only (ADR-0001). `suppressHydrationWarning` is
    // required by next-themes, which sets the theme class on <html> before React hydrates.
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans",
        fontSans.variable,
        fontHeading.variable,
        fontMono.variable,
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
