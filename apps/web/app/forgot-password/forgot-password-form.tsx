"use client";

import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import { useId, useState } from "react";

import { authClient } from "@/src/auth-client";

/**
 * Ask for a reset link.
 *
 * **This never refuses anybody, and that is a decision with an ADR behind it.** ADR-0032's
 * failed-sign-in counter is explicitly barred from reaching password reset: someone being locked out
 * by an attacker's failed attempts is the exact person who needs this form, and rate-limiting it
 * would hand an attacker a way to keep them out permanently.
 *
 * **The response is identical whether or not the address exists.** Same reasoning as the signup
 * adapter — whether somebody holds an Encuentra account is a signal about their employment
 * situation. Better Auth's `requestPasswordReset` is already neutral; this renders the confirmation
 * even when it reports an error, so a transport failure cannot become an oracle either.
 */
export function ForgotPasswordForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  /**
   * Called through a `void`-ing wrapper below rather than handed to `onSubmit` directly. A
   * `Promise`-returning function on a DOM attribute is `typescript(no-misused-promises)`, and the
   * rule is right: React ignores the returned promise, so a rejection inside it becomes an unhandled
   * rejection nobody renders. Every failure below is caught and turned into state before it settles.
   */
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    } catch {
      // **Swallowed on purpose, and only here.** The stated property of this screen is that the
      // response is identical whether or not the address exists — so a transport failure must not
      // become the one case that renders something different, or it is an oracle. The cost is that a
      // genuinely broken network looks like success; the person retries, which is what the copy
      // already tells them to do if no mail arrives.
      //
      // Without the `catch` at all it was worse than either: the promise rejected, `setSent` never
      // ran, and the button stayed disabled reading "Enviando…" for ever.
    }

    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="border-success-border bg-success-surface rounded-lg border p-5">
        <h2 className="font-heading text-success mb-2 text-lg font-semibold">Revisa tu correo</h2>
        <p className="mb-3 text-[0.9375rem]">
          Si esa dirección tiene una cuenta, te enviamos un enlace para cambiar la contraseña.
        </p>
        <p className="text-muted-foreground text-sm">
          El enlace sirve durante una hora. Si no llega, míralo en la carpeta de spam — y si aun así
          no aparece, vuelve a pedirlo.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="mb-6">
        <Label htmlFor={emailId}>Correo electrónico</Label>
        <Input
          id={emailId}
          type="email"
          className="mt-1.5"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending || email.length === 0}>
        {pending ? "Enviando…" : "Enviar el enlace"}
      </Button>
    </form>
  );
}
