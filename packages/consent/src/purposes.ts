import { PURPOSES, type Purpose } from "@repo/db/schema";

/**
 * **Purpose metadata is code, not rows** (ADR-0007), and the reason is not tidiness.
 *
 * Bumping a Purpose's required disclosure version is the mechanism by which a change of _finalidad_
 * invalidates every existing consent for it. That has to be **a code change shipping in the same
 * commit as the markdown file and the art. 5 notification** — reviewable, revertable, and impossible
 * to perform with an `UPDATE` against production. A table would let the three drift apart, and the
 * drift would be silent.
 */

/**
 * Whether a Purpose may be insisted upon. **Three states, not a boolean** (ADR-0007 as amended by
 * ADR-0010).
 *
 * The third exists so that D.1377 art. 6's ban on conditioning an activity on **sensitive** data is
 * enforced in code rather than remembered. `photo` is currently its only member and cannot be
 * required by anything — not a completeness score, not publishing, not an Offer, not ranking.
 */
export const REQUIREMENTS = ["required", "optional", "never-requirable"] as const;

export type Requirement = (typeof REQUIREMENTS)[number];

/** The consent surfaces, each with its own Disclosure document (ADR-0007). */
export const CONSENT_SURFACES = [
  "signup",
  "publish",
  "offer-send",
  "offer-accept",
  "photo",
] as const;

export type ConsentSurface = (typeof CONSENT_SURFACES)[number];

export interface PurposeMetadata {
  readonly requirement: Requirement;
  /** Where this Purpose is asked for. One Disclosure per surface, never one per Purpose. */
  readonly surface: ConsentSurface;
  /**
   * The oldest Disclosure version a grant may be against and still count.
   *
   * A Person whose latest grant predates this is treated as **not consented** — ADR-0007's
   * re-consent, which *fails closed*: the feature stops immediately and an interstitial asks for
   * only the purposes that changed.
   *
   * **Null for `disclose_contact` alone**, which is exempt: it is granted fresh per Offer, so there
   * is never a stale grant to invalidate.
   */
  readonly minimumDisclosureVersion: string | null;
}

/**
 * The six Purposes of the v1 vocabulary, with what each one may demand and where it is asked.
 *
 * `satisfies Record<Purpose, …>` is what keeps this exhaustive: adding a value to `PURPOSES` in
 * `@repo/db` fails to compile here until it is described, which is the property that makes "metadata
 * is code" worth more than a table would have been.
 */
export const PURPOSE_METADATA = {
  /** Hold an account and a profile. Nothing lawful remains without it. */
  account: { requirement: "required", surface: "signup", minimumDisclosureVersion: "2026-08-19" },

  /**
   * Messages about the service itself. **Required is lawful here specifically** — Ley 2300 art. 5
   * par. 2 forbids requiring consent to *commercial* messages while expressly allowing those
   * "estrictamente relacionados con el bien o servicio adquirido".
   */
  transactional_messages: {
    requirement: "required",
    surface: "signup",
    minimumDisclosureVersion: "2026-08-19",
  },

  /**
   * Moderation and investigation. **Required because Colombia has no legitimate-interest basis** —
   * there is no lawful route to moderating a Person who refused it, so refusing means there is no
   * account.
   */
  safety: { requirement: "required", surface: "signup", minimumDisclosureVersion: "2026-08-19" },

  /**
   * Consented at the moment of publishing rather than at signup, because it starts a new _finalidad_
   * for data already held. Its Disclosure names **both** public surfaces — the landing-page wall and
   * a shareable public link (ADR-0011).
   */
  publish: { requirement: "optional", surface: "publish", minimumDisclosureVersion: null },

  /**
   * Granted per Offer, by each side separately: the sender at the moment of sending, the recipient
   * at acceptance (ADR-0007).
   *
   * **The one Purpose exempt from the minimum-version check**, and `null` is how that is spelled: a
   * grant is minted fresh for each Offer, so there is never a stale one to invalidate.
   */
  disclose_contact: {
    requirement: "optional",
    surface: "offer-send",
    minimumDisclosureVersion: null,
  },

  /**
   * **Never requirable** — the only member of the third state, and the counter-example that proves
   * the rule. A profile photograph is sensitive under the SIC's current position (ADR-0010), and
   * D.1377 art. 6 bans conditioning an activity on sensitive data.
   *
   * Its Disclosure also demands more than an unticked box: art. 6(a) needs consent that is
   * **explicit**, and per SIC Conceptos 18-171259 and 17-364624 the _conducta inequívoca_ route is
   * not sufficient for sensitive data.
   */
  photo: { requirement: "never-requirable", surface: "photo", minimumDisclosureVersion: null },
} as const satisfies Record<Purpose, PurposeMetadata>;

/** Every Purpose collected at one surface, for the Disclosure that has to declare them. */
export function purposesForSurface(surface: ConsentSurface): Purpose[] {
  return PURPOSES.filter((purpose) => PURPOSE_METADATA[purpose].surface === surface);
}

/**
 * The Purposes asked at `/signup`, in the order the form renders them.
 *
 * **Three.** `suggestions` left the v1 set with ADR-0016 and `news` followed it, both on the same
 * argument: nothing sends either, and consenting to a _finalidad_ nobody pursues makes the
 * Disclosure describe a fiction.
 *
 * Derived from the metadata rather than listed again, so the form and the rule cannot disagree —
 * the ordering is fixed by `PURPOSES` in `@repo/db`.
 */
export const SIGNUP_PURPOSES = purposesForSurface("signup");

/**
 * The ones that refuse to proceed unless ticked.
 *
 * Nothing here is pre-ticked and nothing is bundled: the SIC's _Formatos modelo_ (2022) requires
 * each _finalidad_ to be separately selectable, and D.1377 art. 7 forbids treating silence as
 * consent. "Required" means *refusing it means there is no account*, never *ticked for you*.
 *
 * **With `news` gone this is every signup Purpose, and the two constants coinciding is a fact about
 * today rather than a redundancy to collapse.** The distinction is what the form renders against: a
 * box is required because its metadata says so, never because it happens to be on the signup
 * surface. Collapsing them would make the next optional Purpose a silent condition of signing up.
 *
 * It also puts the whole weight of D.1377 art. 7 on the copy. The form no longer demonstrates on
 * its own face that a refusal is real — no box on it can be refused and still yield an account — so
 * each _finalidad_ has to be stated separately and the consequence stated plainly, which is what
 * the Disclosure does and what `/signup` has to keep doing.
 */
export const REQUIRED_SIGNUP_PURPOSES = SIGNUP_PURPOSES.filter(
  (purpose) => PURPOSE_METADATA[purpose].requirement === "required",
);
