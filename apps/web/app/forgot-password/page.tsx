import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "../_auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Recupera tu cuenta — Encuentra",
  description: "Pide un enlace para cambiar la contraseña de tu cuenta de Encuentra.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recupera tu cuenta"
      lede="Te enviamos un enlace al correo con el que te registraste."
      footer={
        <Link href="/signin" className="text-primary underline underline-offset-4">
          Volver a entrar
        </Link>
      }
    >
      <ForgotPasswordForm />
      {/* Stated where somebody in trouble will actually read it, not only in the disclosure. It is
          ADR-0009's accepted cost: no manual identity desk, because we hold no document of yours and
          cannot tell you from someone impersonating you. */}
      <p className="text-muted-foreground mt-6 border-t border-border pt-5 text-sm">
        Tu correo es la única forma de recuperar la cuenta. Si perdiste el acceso a ese correo y
        también olvidaste la contraseña, no vamos a poder devolvértela.
      </p>
    </AuthShell>
  );
}
