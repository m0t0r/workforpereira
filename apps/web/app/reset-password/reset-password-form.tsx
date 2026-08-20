"use client";

import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { authClient } from "@/src/auth-client";

/**
 * Set a new password from the emailed token.
 *
 * **Every session is revoked when this succeeds** — `revokeSessionsOnPasswordReset` is true in
 * `@repo/auth`, against Better Auth's default. Password reset is the recovery floor and the thing an
 * account takeover goes through; leaving other sessions alive would mean the person who just proved
 * mailbox control still shares the account with whoever prompted the reset. The copy says so, because
 * being signed out everywhere is otherwise indistinguishable from something having gone wrong.
 *
 * **A failure here is told plainly**, unlike the two screens before it. There is no enumeration
 * concern left — holding the token already proves mailbox control — and the only useful thing to say
 * to somebody whose link expired is that it expired and how to get another.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const passwordId = useId();
  const confirmId = useId();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= 8 && confirm === password;

  /**
   * Called through a `void`-ing wrapper below rather than handed to `onSubmit` directly. A
   * `Promise`-returning function on a DOM attribute is `typescript(no-misused-promises)`, and the
   * rule is right: React ignores the returned promise, so a rejection inside it becomes an unhandled
   * rejection nobody renders. Every failure below is caught and turned into state before it settles.
   */
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    let failure;
    try {
      ({ error: failure } = await authClient.resetPassword({ token, newPassword: password }));
    } catch {
      // See `signin-form.tsx`: `authClient` is documented as returning `{ error }` rather than
      // throwing, and a rejection here would otherwise leave the button disabled reading
      // "Guardando…" for ever with nothing rendered.
      setPending(false);
      setError("No pudimos conectarnos. Revisa tu conexión y vuelve a intentarlo.");
      return;
    }

    setPending(false);

    if (failure) {
      setError(
        "Ese enlace ya no sirve. Los enlaces duran una hora — pide uno nuevo y vuelve a intentarlo.",
      );
      return;
    }

    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="border-success-border bg-success-surface rounded-lg border p-5">
        <h2 className="font-heading text-success mb-2 text-lg font-semibold">
          Tu contraseña quedó cambiada
        </h2>
        <p className="mb-4 text-[0.9375rem]">
          Por seguridad cerramos la sesión en todos los dispositivos. Entra otra vez con la
          contraseña nueva.
        </p>
        <Button size="lg" render={<Link href="/signin" />} nativeButton={false}>
          Ir a entrar
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {error ? (
        <div
          role="alert"
          className="border-destructive-border bg-destructive-surface text-destructive mb-5 rounded-lg border p-3.5 text-sm"
        >
          <p className="mb-2">{error}</p>
          <Link href="/forgot-password" className="underline underline-offset-4">
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : null}

      {/* **`warning`, not `destructive`.** `packages/design-system/README.md`: *"`destructive` is
          only ever a limit of the platform, never anything a person did"*. A password that is eight
          characters short is the person's own typing mid-flight, and colouring it with the token
          reserved for our refusals tells them they broke something. `destructive` stays on the two
          things that genuinely are ours: an expired token and a failure on our side. */}
      <div className="mb-5">
        <Label htmlFor={passwordId}>Contraseña nueva</Label>
        <p className="text-muted-foreground mt-1 text-sm">Mínimo 8 caracteres.</p>
        <Input
          id={passwordId}
          type="password"
          className="mt-1.5"
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        {tooShort ? (
          <p className="text-warning mt-1.5 text-sm">Necesita al menos 8 caracteres.</p>
        ) : null}
      </div>

      <div className="mb-6">
        <Label htmlFor={confirmId}>Repite la contraseña</Label>
        <Input
          id={confirmId}
          type="password"
          className="mt-1.5"
          value={confirm}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch ? (
          <p className="text-warning mt-1.5 text-sm">Las dos contraseñas no coinciden.</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!ready || pending}>
        {pending ? "Guardando…" : "Cambiar la contraseña"}
      </Button>

      <p className="text-muted-foreground mt-3 text-center text-sm">
        Al cambiarla se cierra la sesión en todos los dispositivos.
      </p>
    </form>
  );
}
