/**
 * The 18+ gate (ADR-0007), as a function taking **no database handle** — so ADR-0017 makes it a unit
 * test, and the whole of the rule is readable in one file.
 *
 * Ley 1581 art. 7 prohibits treating a minor's non-public data, and Colombian law defines no age of
 * digital consent below majority, so the line is simply eighteen. ADR-0007 and ADR-0009 both
 * considered an attestation checkbox instead and rejected it twice: it is worth nothing the day a
 * 16-year-old signs up and we have to show what we asked.
 */

export const MINIMUM_AGE_YEARS = 18;

/**
 * Colombia is a fixed **UTC−5 all year** — there is no DST (ADR-0008 records the fact so that #26's
 * business-day clock does not rediscover it).
 *
 * The offset is here rather than in a `toLocaleDateString` call because ADR-0008 requires every
 * `America/Bogota`-relative computation to be **explicit in application code**, never an
 * `AT TIME ZONE` in a query and never an inherited session timezone.
 */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The calendar date it is **in Pereira** at a given instant, as `YYYY-MM-DD`.
 *
 * This matters by exactly one day, to exactly the people the gate is about. Someone signing up at
 * 22:00 on their eighteenth birthday in Risaralda is at 03:00 the *next* day in UTC — so a gate
 * evaluated on the server's clock would let them in a day early, and one evaluated the other way
 * would turn them away on the day they became an adult.
 */
export function bogotaCalendarDate(instant: Date): string {
  return new Date(instant.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Thrown rather than returned: a malformed date is a bug in the caller, not a young person. */
export class InvalidDateOfBirthError extends Error {
  readonly code = "DATE_OF_BIRTH_INVALID";

  constructor(value: string) {
    super(`date of birth must be a calendar date as YYYY-MM-DD, got ${JSON.stringify(value)}`);
    this.name = "InvalidDateOfBirthError";
  }
}

/**
 * Is this person eighteen, on the Pereira calendar, at this instant?
 *
 * **Compared as strings, deliberately.** The eighteenth birthday is the date of birth with eighteen
 * added to its year, and `YYYY-MM-DD` sorts lexicographically exactly as it sorts chronologically —
 * so the comparison needs no `Date` arithmetic, no month-length table and no timezone at all beyond
 * the one already applied to "today". Every alternative here (adding milliseconds, `setFullYear`,
 * differencing two `Date`s) reintroduces an offset at the one boundary this function exists to get
 * right.
 *
 * **One consequence, named rather than discovered.** Someone born on 29 February has no birthday in
 * a non-leap year, and this makes them an adult on 1 March: `"2026-02-29"` is not a real date but it
 * still sorts between the 28th and the 1st, so the comparison lands on the later day. That is the
 * conventional civil-law answer and the conservative one — it never admits a minor early.
 */
export function isAdult(dateOfBirth: string, at: Date): boolean {
  if (!CALENDAR_DATE.test(dateOfBirth)) throw new InvalidDateOfBirthError(dateOfBirth);

  const year = Number(dateOfBirth.slice(0, 4));
  const monthAndDay = dateOfBirth.slice(4);

  // `2026-13-45` passes the shape test. Round-tripping through `Date` is what catches it, and it is
  // done on the *original* string so a rejected value is the one the caller passed.
  const parsed = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateOfBirth) {
    throw new InvalidDateOfBirthError(dateOfBirth);
  }

  const eighteenthBirthday = `${String(year + MINIMUM_AGE_YEARS)}${monthAndDay}`;
  return eighteenthBirthday <= bogotaCalendarDate(at);
}
