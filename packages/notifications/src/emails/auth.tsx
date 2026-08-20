import type { ReactElement } from "react";
import { Link } from "react-email";

import { NotificationLayout, Paragraph } from "./layout";

/**
 * The two authentication messages (#70), and **the only two components in this package that take a
 * prop**.
 *
 * ADR-0015's rule was *a template takes no parameters*, and its purpose was structural: no Contact
 * Detail can appear in a notification if there is no slot for one. A verification link cannot be
 * written under that rule — the whole message is the link — so the ADR is amended, and the amendment
 * is deliberately the narrowest thing that works:
 *
 * - The slot is a **single-use token**, not a body and not a URL. It is opaque to everyone including
 *   us, it identifies a `verifications` row rather than a person, and it is not a Contact Detail.
 * - **The component composes the URL**, so no caller is ever in a position to put something else in
 *   it. The origin arrives beside the token because ADR-0022 leaves the domain unprovisioned and a
 *   hardcoded one would be wrong in every environment.
 * - The database refuses a token on any other template (`notification_outbox_token_check`), so the
 *   five Offer templates still have no slot at all.
 *
 * `templates.invariant.test.ts` is what holds the narrowness, together with
 * `outbox.invariant.test.ts` beside it.
 *
 * **The paths are Better Auth's contract on one side and ours on the other**, and the asymmetry is
 * real rather than an inconsistency. `/api/auth/verify-email` is Better Auth's own endpoint and the
 * link must hit it directly; `/reset-password` is a page in `apps/web` that collects the new
 * password and calls the API itself, which is the pattern Better Auth documents.
 */

export interface AuthLinkProps {
  /** The single-use token from Better Auth's `sendVerificationEmail` / `sendResetPassword`. */
  readonly token: string;
  /** The application's own origin, e.g. `https://encuentra.example`. No trailing slash. */
  readonly appUrl: string;
}

const AFTER_VERIFICATION = "/signin?verified=1";

function verificationUrl({ appUrl, token }: AuthLinkProps): string {
  const url = new URL("/api/auth/verify-email", appUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", AFTER_VERIFICATION);
  return url.toString();
}

function passwordResetUrl({ appUrl, token }: AuthLinkProps): string {
  const url = new URL("/reset-password", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Sent once, at signup.
 *
 * The copy carries ADR-0009's decision rather than describing a chore: verification gates publishing
 * and Offers, **not** sign-in — so this may not say "confirm your address to continue", because that
 * is not true and the person can sign in right now. What it must say instead is why the address
 * matters, which is that it is the only way back in.
 */
export function EmailVerification(props: AuthLinkProps): ReactElement {
  return (
    <NotificationLayout preview="Confirma tu correo en Encuentra">
      <Paragraph>Bienvenido a Encuentra. Confirma que este correo es tuyo:</Paragraph>
      <Paragraph>
        <Link href={verificationUrl(props)}>Confirmar mi correo</Link>
      </Paragraph>
      <Paragraph>
        Ya puedes entrar a tu cuenta sin confirmarlo. Lo necesitas para publicar tu perfil y para
        enviar propuestas — y sobre todo, es la única forma de recuperar tu cuenta si olvidas la
        contraseña.
      </Paragraph>
      <Paragraph>
        El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.
      </Paragraph>
    </NotificationLayout>
  );
}

/**
 * Sent on request, and **the same message whether or not the address has an account**.
 *
 * Better Auth answers `/request-password-reset` identically for an unknown address (audit §5.4), so
 * nothing here may contradict that by implying the account exists. The wording is written to be true
 * either way.
 */
export function PasswordReset(props: AuthLinkProps): ReactElement {
  return (
    <NotificationLayout preview="Cambia tu contraseña en Encuentra">
      <Paragraph>Alguien pidió cambiar la contraseña de esta cuenta en Encuentra.</Paragraph>
      <Paragraph>
        <Link href={passwordResetUrl(props)}>Elegir una contraseña nueva</Link>
      </Paragraph>
      <Paragraph>
        El enlace vence en una hora y solo sirve una vez. Al usarlo cerramos la sesión en todos los
        dispositivos, incluido este.
      </Paragraph>
      <Paragraph>
        Si no lo pediste, no tienes que hacer nada: tu contraseña sigue igual mientras no uses el
        enlace.
      </Paragraph>
    </NotificationLayout>
  );
}
