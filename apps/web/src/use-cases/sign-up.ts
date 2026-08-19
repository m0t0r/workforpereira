import type { Db, Tx } from "@repo/db";
import { recordSignupConsents, type ConsentDecision } from "@repo/consent";
import { createPerson, isAdult, linkToUser, MINIMUM_AGE_YEARS, type Person } from "@repo/people";

/**
 * **Someone arrives with no account and leaves with one, and the evidence that they consented exists
 * before any personal data was stored.**
 *
 * This is ADR-0007's ordering, and it is the reason a use case exists at all: the rule spans three
 * tables owned by three packages, and is observable from none of them alone.
 *
 *     our transaction:  persons  →  consents ×4        commit
 *     then:             users (Better Auth)
 *     then:             persons.user_id
 *
 * **Person-first, and the orphan is the argument.** The Better Auth audit establishes that
 * `DrizzleAdapterConfig.transaction` governs Better Auth's *own* transaction and that there is no
 * documented way to enlist `signUpEmail` in one we opened. One of the two rows lands first, and a
 * crash between them leaves an orphan either way. Person-first leaves a `persons` row holding
 * personal data **with** its consent record — deletable, and re-linkable by email on retry.
 * User-first leaves a `users` row holding an email address with **no consent record at all**, which
 * is the precise Ley 1581 art. 9 / 17(b) failure this whole design exists to prevent. ADR-0008
 * sharpens it from the other side: with hard deletes and `RESTRICT` by default, such a row is
 * *owned by nobody and covered by no erasure path*.
 *
 * The window is closed on three sides. `databaseHooks.session.create.before` in `@repo/auth` refuses
 * a session to a `users` row with no `persons` row; ADR-0007's sweep deletes unlinked `persons` rows
 * older than an hour; and a retry with the same address re-links rather than duplicating.
 *
 * **ADR-0009 inverts the order for OAuth and not the reason** — Better Auth creates the user inside
 * the provider callback, so `persons` follows in `user.create.after` with consent already proven by
 * a pending-signup record. `consent-precedes-user.invariant.test.ts` is written against the rule
 * rather than the sequence, so it survives that amendment; #71 owns the change.
 */

/**
 * The signature departs from `docs/module-package-recipe.md`'s `(db, actorPersonId, input)`, and it
 * has to: **there is no actor.** The whole point of this use case is that the Person does not exist
 * when it starts. The `deps` parameter carries the two things that cannot be reached for — Better
 * Auth, which sits at a tier this file is above, and a secret, which a module may never read from
 * the environment (ADR-0006).
 */
export interface SignUpInput {
  /** Authored by the person, always (ADR-0009). */
  readonly fullName: string;
  /** `YYYY-MM-DD`. Checked, stored, and never handed back. */
  readonly dateOfBirth: string;
  readonly email: string;
  readonly password: string;
  /** All four boxes, ticked or not. A missing one is an error, never an inferred refusal. */
  readonly decisions: readonly ConsentDecision[];
}

export interface SignUpDeps {
  /**
   * Creates the Better Auth `users` row — in production `auth.api.signUpEmail`.
   *
   * **A parameter rather than an import**, for two reasons that point the same way. `apps/web` could
   * import `@repo/auth` directly, but then this function could not be tested at all: Better Auth's
   * API is HTTP-shaped and takes headers, and ADR-0017 forbids faking HTTP. And it is honest about
   * what the audit found — this call is *outside* our transaction, and making that visible in the
   * signature is better than hiding it behind an import that looks like every other one.
   *
   * It receives the handle so a test can write the row against the same PGlite transaction the rest
   * of the use case is using. Production ignores it; Better Auth holds its own.
   */
  readonly createAuthUser: (
    db: Db | Tx,
    input: { name: string; email: string; password: string },
  ) => Promise<{ userId: string }>;

  /** ADR-0021's HMAC key. Never read from the environment inside a module. */
  readonly subjectKeySecret: string;

  readonly now?: () => Date;
}

export interface SignUpResult {
  readonly person: Person;
  readonly userId: string;
}

export class UnderageSignUpError extends Error {
  constructor() {
    super(
      `Se necesitan ${String(MINIMUM_AGE_YEARS)} años para crear una cuenta (Ley 1581 art. 7).`,
    );
    this.name = "UnderageSignUpError";
  }
}

/**
 * Better Auth refused *after* the Person and their consents were committed.
 *
 * A distinct type because the caller has to say something different: everything before this point
 * means nothing was written and the form can be re-submitted freely, while this means the Person
 * exists and the address is the thing to fix. `cause` carries Better Auth's own error, so the
 * adapter can distinguish "that address is taken" from "the database is down" without this file
 * knowing either vocabulary.
 */
export class SignUpAccountCreationError extends Error {
  constructor(
    readonly personPublicId: string,
    cause: unknown,
  ) {
    super(
      `the Person was created but their account was not: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = "SignUpAccountCreationError";
  }
}

export async function signUp(
  db: Db | Tx,
  input: SignUpInput,
  deps: SignUpDeps,
): Promise<SignUpResult> {
  const now = deps.now?.() ?? new Date();

  /**
   * **Normalised once, here, before anything uses it.** The address becomes both the Better Auth
   * identity and — hashed — the `subject_key` that outlives an erasure, and the two must agree
   * forever: a Titular who signed up with a capital letter and later types their address in lower
   * case has to find their own consent evidence.
   */
  const email = input.email.trim().toLowerCase();

  // Refused before a single row is written, so nothing has to be undone and no address is ever held
  // for an account we declined to create. `createPerson` checks it again — that one is the rule, and
  // this one is the refusal the form can render.
  if (!isAdult(input.dateOfBirth, now)) throw new UnderageSignUpError();

  /**
   * **One transaction: the Person and the proof of authorisation land together or not at all.**
   *
   * If the consents cannot be written — a required box refused, the disclosure not seeded — the
   * Person is rolled back with them. A `persons` row without its `consents` rows is the thing
   * ADR-0007 refuses to let exist for even an instant.
   */
  const person = await db.transaction(async (tx) => {
    const created = await createPerson(
      tx,
      { fullName: input.fullName, dateOfBirth: input.dateOfBirth },
      now,
    );

    await recordSignupConsents(tx, {
      personPublicId: created.publicId,
      email,
      subjectKeySecret: deps.subjectKeySecret,
      decisions: input.decisions,
      now,
    });

    return created;
  });

  // **Outside the transaction, and it cannot be otherwise.** This is the seam the whole ordering was
  // designed around; a failure here leaves the designed orphan rather than an unauthorised account.
  let userId: string;
  try {
    ({ userId } = await deps.createAuthUser(db, {
      name: person.fullName,
      email,
      password: input.password,
    }));
  } catch (error) {
    throw new SignUpAccountCreationError(person.publicId, error);
  }

  const linked = await linkToUser(db, person.publicId, userId);
  if (!linked) {
    // The Person was committed moments ago and nothing deletes one this quickly, so this is a bug
    // rather than a race — and it leaves a `users` row that cannot sign in until the sweep clears
    // it, which is a state worth naming rather than returning a half-built result for.
    throw new Error(
      `signUp: the Person ${person.publicId} vanished between being created and being linked to ` +
        `${userId}. The account exists and cannot sign in until ADR-0007's sweep clears it.`,
    );
  }

  return { person: linked, userId };
}
