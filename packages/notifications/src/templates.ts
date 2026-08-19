import type { NotificationTemplate } from "@repo/db/schema";

/**
 * Every message this platform can send, written out in full.
 *
 * **A template takes no parameters, and that is the whole design.** ADR-0015 forbids Contact
 * Details in any notification — email is a channel we do not control, forwardable and retained
 * indefinitely, so a phone number in one moves the disclosure outside every Consent record and
 * contact-exchange log ADR-0007 exists to produce. A rule stated at the call sites is a rule
 * somebody eventually forgets; a template with nowhere to put a value cannot be broken.
 *
 * It is also why `notification_outbox` has no `body` column and no `params` column. The row names
 * a message; it never carries one. `templates.invariant.test.ts` holds both halves.
 *
 * Spanish, because ADR-0001 confines Spanish to what a user reads and this is read by a user.
 *
 * **Named gap: none of these carries a link.** The message says to sign in, per ADR-0015, and does
 * not say where — the domain is unprovisioned (ADR-0022's launch gate) and a base URL would have to
 * arrive as a render parameter, which is the one thing this catalogue must not have. Whoever
 * provisions the domain decides whether the URL becomes a constant here or the templates gain a
 * typed, non-personal parameter, and amends ADR-0015 if it is the second.
 */
export interface RenderedMessage {
  readonly subject: string;
  readonly body: string;
}

const AUTOMATED = "Este es un mensaje automático. No respondas a este correo.";

export const NOTIFICATION_MESSAGES: Readonly<Record<NotificationTemplate, RenderedMessage>> = {
  offer_received: {
    subject: "Recibiste una propuesta en Encuentra",
    body: [
      "Alguien te envió una propuesta de trabajo.",
      "Inicia sesión en Encuentra para ver los términos y responder.",
      AUTOMATED,
    ].join("\n\n"),
  },
  offer_accepted: {
    subject: "Aceptaron tu propuesta",
    body: [
      "La persona a la que le enviaste una propuesta la aceptó.",
      "Inicia sesión en Encuentra para ver sus datos de contacto y acordar el trabajo.",
      AUTOMATED,
    ].join("\n\n"),
  },
  offer_declined: {
    subject: "No aceptaron tu propuesta",
    body: [
      "La persona a la que le enviaste una propuesta no la aceptó, y pudo haber dejado un motivo.",
      "Inicia sesión en Encuentra para verlo. Puedes cambiar los términos y enviar otra propuesta.",
      AUTOMATED,
    ].join("\n\n"),
  },
  offer_withdrawn: {
    subject: "Retiraron una propuesta que recibiste",
    body: [
      "Quien te envió una propuesta la retiró antes de que respondieras.",
      "Inicia sesión en Encuentra para ver tus propuestas.",
      AUTOMATED,
    ].join("\n\n"),
  },
  offer_expired: {
    subject: "Una propuesta venció sin respuesta",
    body: [
      "Una propuesta llegó al final de su plazo y ya no se puede responder.",
      "Inicia sesión en Encuentra para ver tus propuestas.",
      AUTOMATED,
    ].join("\n\n"),
  },
};

/** The message a row names. A lookup, deliberately — there is nothing to interpolate. */
export function renderNotification(template: NotificationTemplate): RenderedMessage {
  return NOTIFICATION_MESSAGES[template];
}
