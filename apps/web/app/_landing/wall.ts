/**
 * The Wall's data seam.
 *
 * `CONTEXT.md`: a Wall is "the bounded, rotating sample of real Capability Profiles and real Needs
 * that anyone can see without an account" — never an index. There are two of them because the two
 * kinds of Publication carry opposite risks (ADR-0011).
 *
 * **This is a placeholder, and the types are the point.** No table has been designed yet
 * (`packages/db/src/schema/index.ts` is empty), so `readWall` returns nothing and both Walls render
 * their empty state. Fictional people are not an option: `packages/design-system/README.md` allows
 * fictional person data only inside a prototype clearly marked as one, and this is the product.
 *
 * **Where this goes.** ADR-0030 puts the public Need projection in `@repo/matching`, "which the Wall
 * reads the same rows through", and places the `hirer_home` author rule there rather than in the
 * card — a module function is an ADR-0017 seam and a React component is not, so that rule can carry
 * an Invariant Test and a JSX branch could not. When `@repo/matching` exists, `readWall` moves into
 * it and this file goes away; the shape below is what the card components already expect.
 */

/** ADR-0013's five values. */
export type WorkSetting =
  | "hirer_home"
  | "worker_home"
  | "business_premises"
  | "public_or_varied"
  | "remote";

/** ADR-0033's three values — whether the work ends, and nothing about hours or dates. */
export type Commitment = "one_off" | "temporary" | "ongoing";

/**
 * A Capability Profile as the public tier sees it (ADR-0011's fields table): full name, Photo if the
 * Person opted the third state in, department only — never the exact Municipality — skills, and
 * whether they work remotely.
 */
export type WallProfile = {
  publicId: string;
  fullName: string;
  department: string;
  /** Null when there is no Photo or it is not public. Rendered as nothing at all — see `ProfileCard`. */
  photoUrl: string | null;
  remote: boolean;
  skills: string[];
};

/**
 * A Need as the public tier sees it (ADR-0014, amended by ADR-0030 and ADR-0033): the work and not
 * the author. The exact Municipality is public; there is never a Photo.
 */
export type WallNeed = {
  publicId: string;
  municipality: string;
  department: string;
  commitment: Commitment;
  workSetting: WorkSetting;
  /** Shown as prose, never queried. */
  selfDescription: string;
  skills: string[];
  /**
   * Null on a `hirer_home` Need, where the author's name and the link to their Public View wait for
   * a session (ADR-0030). **The projection drops it, never the component** — a card handed a name
   * renders one.
   */
  author: { publicId: string; fullName: string } | null;
};

export type Wall = {
  profiles: WallProfile[];
  needs: WallNeed[];
};

export async function readWall(): Promise<Wall> {
  return { profiles: [], needs: [] };
}
