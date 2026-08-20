import {
  TOKEN_BEARING_TEMPLATES,
  type NotificationTemplate,
  type TokenBearingTemplate,
} from "@repo/db/schema";
import type { ReactElement } from "react";
import { render } from "react-email";

import { EmailVerification, PasswordReset, type AuthLinkProps } from "./emails/auth";
import {
  OfferAccepted,
  OfferDeclined,
  OfferExpired,
  OfferReceived,
  OfferWithdrawn,
} from "./emails/offers";

/**
 * Every message this platform can send, as React Email components rendered to both parts.
 *
 * **Five templates take nothing at all, and two take a single-use token.** That split is ADR-0015's
 * Contact Details rule as amended by #70, and it is structural rather than a convention: the
 * `NotificationMessage` union below makes handing a token to an Offer template a **compile error**,
 * and `notification_outbox_token_check` makes storing one a **constraint violation**. There is no
 * free-form slot anywhere and nothing for a caller to interpolate.
 *
 * Both parts are produced, not just one. A text-only message is the thing that gets filed as spam,
 * and `plainText` is derived from the same component rather than written twice, so the two can
 * never drift into saying different things — which for a legal-adjacent notification is the real
 * risk, not the styling.
 */
export interface RenderedMessage {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/** A template that says the same thing to everyone. ADR-0015's original rule, still the majority. */
export type ParameterlessTemplate = Exclude<NotificationTemplate, TokenBearingTemplate>;

/**
 * What to render, as a discriminated union — **this type is the invariant**.
 *
 * A `token` cannot be attached to an Offer template because the union has no member that would
 * accept one, and an authentication template cannot be rendered without one because its member
 * requires it. Neither half is enforced by a runtime check that somebody could delete.
 */
export type NotificationMessage =
  | { readonly template: ParameterlessTemplate }
  | ({ readonly template: TokenBearingTemplate } & AuthLinkProps);

/**
 * Subjects live here rather than in the components because a subject is not part of the document —
 * React Email renders a body, and `<Preview>` is the inbox teaser, not the subject line.
 */
const PARAMETERLESS: Readonly<
  Record<ParameterlessTemplate, { subject: string; email: () => ReactElement }>
> = {
  offer_received: {
    subject: "Recibiste una propuesta en Encuentra",
    email: OfferReceived,
  },
  offer_accepted: {
    subject: "Aceptaron tu propuesta",
    email: OfferAccepted,
  },
  offer_declined: {
    subject: "No aceptaron tu propuesta",
    email: OfferDeclined,
  },
  offer_withdrawn: {
    subject: "Retiraron una propuesta que recibiste",
    email: OfferWithdrawn,
  },
  offer_expired: {
    subject: "Una propuesta venció sin respuesta",
    email: OfferExpired,
  },
};

const TOKEN_BEARING: Readonly<
  Record<TokenBearingTemplate, { subject: string; email: (props: AuthLinkProps) => ReactElement }>
> = {
  email_verification: {
    subject: "Confirma tu correo en Encuentra",
    email: EmailVerification,
  },
  password_reset: {
    subject: "Cambia tu contraseña en Encuentra",
    email: PasswordReset,
  },
};

export const NOTIFICATION_TEMPLATE_NAMES = [
  ...Object.keys(PARAMETERLESS),
  ...Object.keys(TOKEN_BEARING),
] as NotificationTemplate[];

const tokenBearing = new Set<string>(TOKEN_BEARING_TEMPLATES);

/** Narrows a template *name*. Use `carriesToken` when you have a whole message. */
export function isTokenBearing(template: NotificationTemplate): template is TokenBearingTemplate {
  return tokenBearing.has(template);
}

/**
 * Narrows a whole `NotificationMessage` to the member that carries a token.
 *
 * **This exists because narrowing on `message.template` does not narrow `message`.** TypeScript
 * discriminates a union on a *literal* property, and both members' `template` is a union of literals
 * rather than one — so a check on the field leaves the object as wide as it was, and reading `token`
 * off it needs a cast. Three casts had accumulated under a comment claiming "this type *is* the
 * invariant", which is the one place a cast is least affordable: it is the assertion, and an
 * assertion held up by `as` asserts nothing.
 */
export function carriesToken(
  message: NotificationMessage,
): message is Extract<NotificationMessage, { token: string }> {
  return isTokenBearing(message.template);
}

/**
 * Rendered once per process, then reused — **for the five parameterless templates only**.
 *
 * Not a micro-optimisation: `renderNotification` is called with the row lock held inside the sending
 * transaction, and everything in that window should be as short as possible. A parameterless
 * template's output is a constant, so caching it is correct by construction rather than by
 * cache-invalidation discipline.
 *
 * **The two token-bearing templates are never cached**, and could not safely be: their output
 * differs per row by design, and a cache keyed on the template name alone would send one person's
 * verification link to the next person who signed up. The map is typed to the parameterless union
 * so that is a compile error rather than a decision someone has to remember.
 */
const rendered = new Map<ParameterlessTemplate, RenderedMessage>();

/** The message a row names. */
export async function renderNotification(message: NotificationMessage): Promise<RenderedMessage> {
  if (carriesToken(message)) {
    const { subject, email } = TOKEN_BEARING[message.template];
    return renderBoth(subject, email({ token: message.token, appUrl: message.appUrl }));
  }

  const { subject, email } = PARAMETERLESS[message.template];
  const cached = rendered.get(message.template);
  if (cached) return cached;

  const result = await renderBoth(subject, email());
  rendered.set(message.template, result);
  return result;
}

async function renderBoth(subject: string, element: ReactElement): Promise<RenderedMessage> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}
