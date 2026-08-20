import type { Purpose } from "@repo/db/schema";

/**
 * What each _finalidad_ says on screen.
 *
 * **The copy lives here rather than in `@repo/consent`, and that is ADR-0001.** Spanish is confined
 * to what a user reads, and a tier-3 domain package is not a place a user reads — putting these
 * strings there would make every consumer of the Purpose vocabulary carry a Spanish UI with it. The
 * package owns *which* Purposes exist and what each may demand; this file owns how they are said.
 *
 * **`satisfies Record<Purpose, …>` is what keeps it honest.** Adding a Purpose to `@repo/db` fails
 * to compile here until it has copy, which is the same guarantee `PURPOSE_METADATA` gets on the
 * other side of the seam. Without it a new Purpose would render as a blank box.
 *
 * The wording is taken near-verbatim from `docs/legal/disclosure-signup/2026-08-19.md`, in the `tú`
 * register, and that is not a style preference: the Disclosure is the art. 12 _información previa_
 * and the frozen row is what a Titular is shown in a dispute. If the screen and the document
 * disagree, the document is right and the screen is the bug.
 *
 * **This file imports no *value* from `@repo/consent`, and that is a hard constraint rather than a
 * preference.** The package's `index.ts` is the seam ADR-0006 admits, and it re-exports
 * `readAuthoredDocuments`, which reads `docs/legal/**` off disk — so the barrel pulls `node:fs`, and
 * a client component that imports anything from it fails `next build` with *"the chunking context
 * does not support external modules (request: node:fs)"*. The `Purpose` import below is `import
 * type`, so it is erased.
 *
 * Which Purposes are asked at signup is therefore resolved **on the server**, in `page.tsx`, and the
 * ordered list is handed to the client flow as a prop. That is the better boundary anyway: the
 * browser should not be the authority on what the consent vocabulary contains.
 */
export interface PurposeCopy {
  /** The heading on the Purpose's own screen. */
  readonly title: string;
  /**
   * The full _finalidad_, **always visible**.
   *
   * There is no one-line summary beside it any more. Round 1's prototype had one, for a
   * `<details>` disclosure that the chosen variant does not use — and a second, shorter wording of
   * a legal sentence that nothing renders is a liability rather than a spare: it drifts from the
   * frozen Disclosure with nothing to catch it.
   */
  readonly detail: string;
}

const COPY = {
  account: {
    title: "Tener tu cuenta y tu perfil",
    detail:
      "Guardar tu nombre, tu fecha de nacimiento y tu correo para que puedas entrar, para " +
      "identificarte dentro de la plataforma y para que otra persona sepa con quién está hablando.",
  },
  transactional_messages: {
    title: "Enviarte mensajes sobre el servicio",
    detail:
      "El correo para verificar tu dirección, el aviso de que alguien te envió una propuesta, el " +
      "aviso de que aceptaron la tuya, y el correo para recuperar tu cuenta si olvidas la " +
      "contraseña. No son mensajes comerciales, y la ley permite expresamente exigirlos cuando " +
      "están estrictamente relacionados con el servicio que usas.",
  },
  safety: {
    title: "Mantener la plataforma segura",
    detail:
      "Revisar los reportes que otras personas hacen, moderar lo que se publica, e investigar " +
      "cuando algo sale mal. En Colombia no existe el interés legítimo como base legal para tratar " +
      "datos, así que sin tu autorización no habría forma lícita de proteger a nadie — " +
      "incluyéndote a ti.",
  },

  /**
   * Consented in context rather than at signup, so `/signup` never renders these. They carry copy
   * anyway because the exhaustiveness check is the point: the ticket that builds the publish surface
   * finds the string already written and in the same register, instead of inventing a second voice.
   */
  publish: {
    title: "Publicar tu perfil o tu necesidad",
    detail:
      "Mostrar tu perfil de capacidades o tu necesidad de trabajo en la página principal de " +
      "Encuentra y en un enlace público que puedes compartir. Puedes dejar de publicar cuando " +
      "quieras.",
  },
  disclose_contact: {
    title: "Compartir tus datos de contacto",
    detail:
      "Cada vez que envías una propuesta o aceptas una, le entregamos tus datos de contacto a la " +
      "otra persona. Lo autorizas una vez por propuesta, y lo que ya se compartió no se puede " +
      "recoger — quien lo recibió responde por esos datos por su cuenta.",
  },
  photo: {
    title: "Mostrar tu foto de perfil",
    detail:
      "Mostrar la fotografía que subas junto a tu perfil. Una foto es un dato sensible, así que " +
      "nunca vamos a exigírtela ni a condicionar nada a que la subas.",
  },
} as const satisfies Record<Purpose, PurposeCopy>;

/** One box, as the client flow receives it. */
export type SignupBox = PurposeCopy & { purpose: Purpose };

/**
 * Join the copy to a Purpose. Called from the **server** page with `SIGNUP_PURPOSES`, so the order
 * and the membership both come from `@repo/consent` rather than being restated here.
 */
export function boxesFor(purposes: readonly Purpose[]): SignupBox[] {
  return purposes.map((purpose) => ({ purpose, ...COPY[purpose] }));
}

/**
 * Said **once**, and only once, at the end of the flow.
 *
 * With `news` gone every signup box is required, so the consequence is a property of all of them
 * rather than of any one — and a person who has just read three different _finalidades_ is in a
 * position to understand it, where the same sentence in advance is a warning about text they have
 * not reached.
 */
export const CONSENT_CONSEQUENCE =
  "Si no autorizas alguna de las tres, no podemos crear la cuenta. No es una barrera comercial: es " +
  "que sin ellas no queda nada lícito que la plataforma pueda hacer.";

/** Shown against a single unticked box. */
export const PER_BOX_REFUSAL = "Sin esta autorización no podemos crear la cuenta.";
