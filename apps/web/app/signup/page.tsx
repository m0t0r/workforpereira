import { SIGNUP_PURPOSES } from "@repo/consent";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "../_auth/auth-shell";
import { boxesFor } from "./copy";
import { SignupFlow } from "./signup-flow";

export const metadata: Metadata = {
  title: "Crea tu cuenta — Encuentra",
  // Nothing here may imply a guarantee of work (ADR-0026). It says what the form does and stops.
  description: "Crea tu cuenta en Encuentra con tu nombre, tu correo y una contraseña.",
};

/**
 * `/signup` — an English route, like every route (ADR-0001), with Spanish on every surface a person
 * reads.
 *
 * A Server Component that resolves the consent vocabulary and hands it to a client flow. The half-
 * filled form itself stays client-side until submit, which is what keeps a `persons` row from
 * existing for someone who wandered off at screen three. On the #71 branch that stops being true — a Pending Signup is written at the
 * redirect — and this page is where that difference will land.
 */
export default function SignUpPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/signin" className="text-primary underline underline-offset-4">
            Entra aquí
          </Link>
        </>
      }
    >
      {/* Resolved here, on the server. `@repo/consent`'s barrel reaches `node:fs`, so the client
          flow can never import it — and the browser should not be the authority on which
          _finalidades_ exist anyway. */}
      <SignupFlow boxes={boxesFor(SIGNUP_PURPOSES)} />
    </AuthShell>
  );
}
