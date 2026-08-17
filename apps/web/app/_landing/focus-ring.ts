/**
 * The 2px visible focus ring the accessibility bar requires on every keyboard-reachable control —
 * `packages/design-system/README.md`. It is `--ring`, which the contrast gate proves clears 3:1.
 *
 * One definition rather than four copies: this is the rule least worth having drift between
 * surfaces. Rounding stays with the caller, because a ring follows the shape it surrounds.
 * `Button` carries its own ring and does not use this.
 */
export const FOCUS_RING =
  "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2";
