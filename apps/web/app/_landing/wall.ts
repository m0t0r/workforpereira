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
 * the author — Skills, the exact Municipality, remote-or-local, Commitment, Work Setting and the
 * Self-description as prose. The **department is not among them**: ADR-0030 replaced it with the
 * exact Municipality rather than adding one beside the other. There is never a Photo.
 */
export type WallNeed = {
  publicId: string;
  municipality: string;
  /**
   * Remote work is a property of the Publication, never a Municipality value — and it is separate
   * from `remote` being one of the five Work Settings, which ADR-0030 kept deliberately.
   */
  remote: boolean;
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

/**
 * **Outside production this returns fictional people, and in production it returns nothing.**
 * `packages/design-system/README.md` allows fictional person data only inside a prototype clearly
 * marked as one, so the marking is threefold and none of it is optional: the rows live in a file
 * that says so at the top, `WallFixtureNotice` puts it on screen above the header, and the
 * `NODE_ENV` guard below means a production build cannot reach the module at all. `next build`
 * prerenders the real, empty Wall; `pnpm dev` renders a page somebody can actually judge.
 *
 * The dynamic `import()` is what makes that guarantee structural rather than stylistic — a static
 * import would pull the fixtures into the production bundle whichever branch ran.
 *
 * **Two properties of a Wall are deferred rather than done here, and neither is a layout concern.**
 * A Wall is bounded — ADR-0011 and ADR-0032 both speak of twelve faces on the landing page — and it
 * **rotates**, on the seeded daily shuffle ADR-0016 shares with search's Result Bands, so that among
 * people equally entitled to be seen none is permanently first and none permanently unreachable.
 * Both belong to whoever selects the rows, which is this function once it is a real query, so
 * neither is expressible while there are no rows. The components below take whatever they are
 * handed and bound nothing themselves — which is also why the Wall copy no longer says the sample
 * changes: a fixed six that claims to rotate is a false sentence, and the claim belongs to the
 * commit that implements the shuffle.
 */
export async function readWall(): Promise<Wall> {
  if (WALL_IS_FICTIONAL) {
    const { WALL_FIXTURES } = await import("./wall-fixtures");
    return WALL_FIXTURES;
  }
  return { profiles: [], needs: [] };
}

/**
 * True wherever the Wall is showing people who do not exist. Read by `page.tsx` to decide whether
 * the notice renders, so the banner and the rows can never disagree.
 */
export const WALL_IS_FICTIONAL = process.env.NODE_ENV !== "production";
