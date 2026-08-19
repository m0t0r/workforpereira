import type { NotificationTemplate } from "@repo/db/schema";
import type { ReactElement } from "react";
import { render } from "react-email";

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
 * **A template takes no parameters, and that is the whole design** — see `emails/offers.tsx` for
 * why ADR-0015's Contact Details rule is structural here rather than a review note.
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

/**
 * Subjects live here rather than in the components because a subject is not part of the document —
 * React Email renders a body, and `<Preview>` is the inbox teaser, not the subject line.
 */
const TEMPLATES: Readonly<
  Record<NotificationTemplate, { subject: string; email: () => ReactElement }>
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

export const NOTIFICATION_TEMPLATE_NAMES = Object.keys(TEMPLATES) as NotificationTemplate[];

/**
 * Rendered once per process, then reused.
 *
 * Not a micro-optimisation: `renderNotification` is called with the row lock held inside the
 * sending transaction (ADR-0028 accepts that the provider call holds it, and everything else in
 * that window should be as short as possible). A template has no parameters, so its output is a
 * constant — caching it is correct by construction rather than by cache-invalidation discipline.
 */
const rendered = new Map<NotificationTemplate, RenderedMessage>();

/** The message a row names. Takes the template and nothing else. */
export async function renderNotification(template: NotificationTemplate): Promise<RenderedMessage> {
  const cached = rendered.get(template);
  if (cached) return cached;

  const { subject, email } = TEMPLATES[template];
  const element = email();
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  const message: RenderedMessage = { subject, html, text };
  rendered.set(template, message);
  return message;
}
