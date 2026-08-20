import type { Metadata } from "next";
import Link from "next/link";

import { Suspense } from "react";

import type { SearchParams } from "../_auth/search-params";
import { AuthShell } from "../_auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Cambia tu contraseña — Encuentra",
  description: "Elige una contraseña nueva para tu cuenta de Encuentra.",
  // A reset link must never be followed by a crawler, and must never end up in an index.
  robots: { index: false, follow: false },
};

/**
 * `/reset-password?token=…` — where the reset email lands.
 *
 * The token is read on the server and handed down as a prop rather than being pulled from the URL in
 * the client component. It changes nothing about who can see it — it is in the address bar either
 * way — but it keeps the missing-token case a *render* decision rather than a flash of a form that
 * cannot work.
 *
 * **Arriving with no token is not an error state, it is a different screen.** Better Auth also
 * redirects here with `?error=INVALID_TOKEN` when it rejects one before the page loads, and both mean
 * the same thing to the person: this link is no good, ask for another.
 *
 * **Everything below the title depends on `searchParams`**, so unlike `/signin` there is nothing
 * static to split out — the whole body goes behind one `<Suspense>`. Reading `searchParams` in the
 * page body would make the route uncacheable, which `cacheComponents` fails the build over rather
 * than doing quietly.
 */
export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Cambia tu contraseña">
          <div className="min-h-64" aria-hidden="true" />
        </AuthShell>
      }
    >
      <ResetPasswordBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordBody({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = params["token"];
  const rejected = params["error"] !== undefined;

  if (typeof token !== "string" || token.length === 0 || rejected) {
    return (
      <AuthShell title="Ese enlace ya no sirve">
        <p className="mb-5 text-[0.9375rem]">
          Los enlaces para cambiar la contraseña duran una hora. Pide uno nuevo y vuelve a
          intentarlo — puedes pedirlo las veces que necesites.
        </p>
        <p>
          <Link href="/forgot-password" className="text-primary underline underline-offset-4">
            Pedir un enlace nuevo
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Cambia tu contraseña">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
