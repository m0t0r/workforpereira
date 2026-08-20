"use client";

import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { authClient } from "@/src/auth-client";

/**
 * Sign-in.
 *
 * **Verification does not gate this** (ADR-0009). An unverified account signs in; blocking sign-in
 * would strand someone whose verification mail landed in spam with nothing to look at.
 *
 * **Nothing yet tells them what they cannot do, and that is honest rather than finished.** #70's
 * third acceptance criterion — *"an unverified account can sign in but cannot publish or send an
 * Offer"* — has no surface to gate: publishing and Offers are later tickets. `users.email_verified`
 * is the flag they will read, and the notice belongs on the screens they build, not here where it
 * would name two things a person cannot yet reach.
 *
 * **This file is where Better Auth's error codes become Spanish, and the only place they do**
 * (ADR-0001, amended). `@repo/auth` used to install `@better-auth/i18n` so the API returned
 * translated messages; it no longer does, because an API error is read by a log, an alert and an
 * on-call engineer before it is read by anybody here. The API returns `INVALID_EMAIL_OR_PASSWORD`
 * and this decides what a person sees.
 *
 * **Credential failures are deliberately collapsed into one message.** `INVALID_EMAIL_OR_PASSWORD`,
 * `USER_NOT_FOUND` and `INVALID_PASSWORD` all render the same sentence: distinguishing "no such
 * account" from "wrong password" would answer *"does this person have an Encuentra account"*, which
 * ADR-0009 spends the whole `autoSignIn: false` decision refusing to answer at signup. It would be
 * strange to protect it there and give it away here.
 *
 * **A rate limit is not a credential failure**, and it is the one that must be told apart. Somebody
 * told their password is wrong retries, which extends the very window that refused them.
 */
/**
 * Better Auth's code, rendered.
 *
 * Not exhaustive over `BASE_ERROR_CODES` on purpose: this route reaches three or four of the thirty,
 * and the fallback is the same neutral credential message every other one has to be anyway. What is
 * matched is what the product needs to say something *different* about.
 */
function signInFailureCopy(failure: { status?: number; code?: string }): string {
  if (failure.status === 429) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  }
  if (failure.code === "EMAIL_NOT_VERIFIED") {
    // Unreachable while `requireEmailVerification` is false (ADR-0009), and handled anyway: the
    // switch is one line away in `@repo/auth`, and a person meeting this deserves better than
    // being told their password is wrong.
    return "Tu correo todavía no está verificado. Abre el mensaje que te enviamos.";
  }
  if (failure.status !== undefined && failure.status >= 500) {
    // Ours, not theirs. Telling somebody their password is wrong when our database is down sends
    // them to reset a password that was never the problem.
    return "Algo salió mal de nuestro lado. Vuelve a intentarlo en un momento.";
  }
  return "El correo o la contraseña no coinciden.";
}

export function SignInForm() {
  const emailId = useId();
  const passwordId = useId();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      ({ error: failure } = await authClient.signIn.email({ email, password }));
    } catch {
      // **`authClient` is documented as returning `{ error }` rather than throwing, and this exists
      // because "documented" is not "guaranteed".** A throwing fetch interceptor or a malformed
      // response body rejects the promise, and without this the `finally` never runs: the button
      // stays disabled reading "Entrando…" for ever, and the rejection is swallowed by the `void`
      // wrapper with nothing rendered.
      setPending(false);
      setError("No pudimos conectarnos. Revisa tu conexión y vuelve a intentarlo.");
      return;
    }

    if (failure) {
      setPending(false);
      // **A rate limit is not a wrong password, and saying so keeps somebody locked out.** Told
      // their password is wrong, a person retries — which extends the very window that refused
      // them. ADR-0032's per-address counter lands in this same branch, so the distinction has to
      // exist before it does. It leaks nothing: a refusal to keep trying says nothing about whether
      // the account exists.
      setError(signInFailureCopy(failure));
      return;
    }

    // `router.refresh()` before navigating, so the server re-renders with the session cookie the
    // sign-in just set rather than serving the cached signed-out tree.
    router.refresh();
    router.push("/");
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
          {error}
        </div>
      ) : null}

      <div className="mb-5">
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

      <div className="mb-2">
        <Label htmlFor={passwordId}>Contraseña</Label>
        <Input
          id={passwordId}
          type="password"
          className="mt-1.5"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <p className="mb-6 text-sm">
        <Link href="/forgot-password" className="text-primary underline underline-offset-4">
          Olvidé mi contraseña
        </Link>
      </p>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
