import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import type { SearchParams } from "../_auth/search-params";
import { AuthShell } from "../_auth/auth-shell";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Entra a tu cuenta — Encuentra",
  description: "Entra a tu cuenta de Encuentra.",
};

/**
 * `/signin`, and the `?verified=1` state the verification link returns to.
 *
 * **The form is static and only the banner is dynamic**, which is why they are split. Reading
 * `searchParams` is a request-time access, and with `cacheComponents` on, doing it in the page body
 * would make the whole route uncacheable — Next fails the build rather than let that happen quietly.
 * Behind a `<Suspense>` boundary the sign-in form prerenders and paints immediately, and only the
 * one-line confirmation waits.
 *
 * The banner is a Server Component rather than a prop into the client form for the same reason:
 * `searchParams` is a server concern, and keeping it there means the client half never has to reach
 * for the URL.
 */
export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell
      title="Entra a tu cuenta"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Créala aquí
          </Link>
        </>
      }
    >
      {/* No reserved height: the banner is one short block that appears above the form, and a
          placeholder the same size would leave a permanent gap on the ordinary sign-in — which is
          every sign-in that did not arrive from a verification link. */}
      {/* The promise is forwarded **unawaited**. Awaiting it here would be the request-time access
          this split exists to avoid, and would make the whole route dynamic again. */}
      <Suspense fallback={null}>
        <VerifiedBanner searchParams={searchParams} />
      </Suspense>
      <SignInForm />
    </AuthShell>
  );
}

/**
 * Any value other than exactly `1` is treated as absent. The banner claims something happened, so it
 * should need the precise thing the verification redirect sends rather than any truthy string
 * somebody appended to the URL.
 */
async function VerifiedBanner({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  if (params["verified"] !== "1") return null;

  return (
    <div
      role="status"
      className="border-success-border bg-success-surface text-success mb-5 rounded-lg border p-3.5 text-sm"
    >
      <strong className="block font-semibold">Tu correo quedó verificado.</strong>
      Ya puedes entrar con tu contraseña.
    </div>
  );
}
