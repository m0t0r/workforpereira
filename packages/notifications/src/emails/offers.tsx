import type { ReactElement } from "react";

import { NotificationLayout, Paragraph } from "./layout";

/**
 * ADR-0015's five terminal ends of an Offer, one component each.
 *
 * **Every one of them takes no props, and that is the point.** ADR-0015 forbids Contact Details in
 * any notification — email is a channel we do not control, forwardable and retained indefinitely,
 * so a phone number in one moves the disclosure outside every Consent record and contact-exchange
 * log ADR-0007 exists to produce. A rule stated at the call sites is a rule somebody eventually
 * forgets; a component with no props cannot be handed one.
 *
 * It is also why `notification_outbox` has no `body` column and no `params` column: the row names a
 * message, it never carries one. `templates.invariant.test.ts` holds both halves.
 *
 * Each says what happened and to sign in, which is exactly what ADR-0015 specifies the acceptance
 * email to say — and no more. **None carries a link**, because the domain is unprovisioned
 * (ADR-0022's launch gate) and a base URL would have to arrive as a parameter, which is the one
 * thing this catalogue must not have.
 */

export function OfferReceived(): ReactElement {
  return (
    <NotificationLayout preview="Alguien te envió una propuesta de trabajo">
      <Paragraph>Alguien te envió una propuesta de trabajo.</Paragraph>
      <Paragraph>Inicia sesión en Encuentra para ver los términos y responder.</Paragraph>
    </NotificationLayout>
  );
}

export function OfferAccepted(): ReactElement {
  return (
    <NotificationLayout preview="Aceptaron tu propuesta">
      <Paragraph>La persona a la que le enviaste una propuesta la aceptó.</Paragraph>
      <Paragraph>
        Inicia sesión en Encuentra para ver sus datos de contacto y acordar el trabajo.
      </Paragraph>
    </NotificationLayout>
  );
}

export function OfferDeclined(): ReactElement {
  return (
    <NotificationLayout preview="No aceptaron tu propuesta">
      <Paragraph>
        La persona a la que le enviaste una propuesta no la aceptó, y pudo haber dejado un motivo.
      </Paragraph>
      <Paragraph>
        Inicia sesión en Encuentra para verlo. Puedes cambiar los términos y enviar otra propuesta.
      </Paragraph>
    </NotificationLayout>
  );
}

export function OfferWithdrawn(): ReactElement {
  return (
    <NotificationLayout preview="Retiraron una propuesta que recibiste">
      <Paragraph>Quien te envió una propuesta la retiró antes de que respondieras.</Paragraph>
      <Paragraph>Inicia sesión en Encuentra para ver tus propuestas.</Paragraph>
    </NotificationLayout>
  );
}

export function OfferExpired(): ReactElement {
  return (
    <NotificationLayout preview="Una propuesta venció sin respuesta">
      <Paragraph>Una propuesta llegó al final de su plazo y ya no se puede responder.</Paragraph>
      <Paragraph>Inicia sesión en Encuentra para ver tus propuestas.</Paragraph>
    </NotificationLayout>
  );
}
