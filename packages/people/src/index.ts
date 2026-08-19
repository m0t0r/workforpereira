/**
 * `@repo/people` — tier 2 of ADR-0006's DAG. `persons`, and the nullable `user_id` seam of ADR-0002.
 *
 * **This entry point is the seam.** ADR-0006's `exports` map admits exactly this file, so nothing
 * else in the package is reachable, and ADR-0017 allows a test at a function exported from here and
 * nowhere else inside the package.
 *
 * Two things are load-bearing rather than incidental:
 *
 * - **A Person is created before their authentication account** (ADR-0007), so `createPerson`
 *   returns a row whose `userId` is null and `linkToUser` closes the seam afterwards. The window
 *   between them is designed: it leaves personal data with its consent record rather than a `users`
 *   row with no authorisation behind it.
 * - **`dateOfBirth` is not on the public type.** It is written, checked once by the 18+ gate, and
 *   never handed back — because age is a discrimination vector and ADR-0007 bars it from any public
 *   type or search filter.
 */

export { bogotaCalendarDate, InvalidDateOfBirthError, isAdult, MINIMUM_AGE_YEARS } from "./age";

export {
  createPerson,
  linkToUser,
  personByPublicId,
  personByUserId,
  UnderageError,
  type CreatePersonInput,
  type Person,
} from "./persons";
