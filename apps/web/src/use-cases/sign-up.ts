import type { Db, Tx } from "@repo/db";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { recordSignupConsents, type ConsentDecision } from "@repo/consent";
import { createPerson, isAdult, linkToUser, MINIMUM_AGE_YEARS, type Person } from "@repo/people";

/**
 * **Someone arrives with no account and leaves with one, and the evidence that they consented exists
 * before any personal data was stored.**
 *
 * This is ADR-0007's ordering, and it is the reason a use case exists at all: the rule spans three
 * tables owned by three packages, and is observable from none of them alone.
 *
 *     our transaction:  persons  →  one consents row per signup Purpose      commit
 *     then:             users (Better Auth)
 *     then:             persons.user_id
 *
 * **Person-first, and the orphan is the argument.** The Better Auth audit establishes that
 * `DrizzleAdapterConfig.transaction` governs Better Auth's *own* transaction and that there is no
 * documented way to enlist `signUpEmail` in one we opened. One of the two rows lands first, and a
 * crash between them leaves an orphan either way. Person-first leaves a `persons` row holding
 * personal data **with** its consent record — authorised, and deletable.
 * User-first leaves a `users` row holding an email address with **no consent record at all**, which
 * is the precise Ley 1581 art. 9 / 17(b) failure this whole design exists to prevent. ADR-0008
 * sharpens it from the other side: with hard deletes and `RESTRICT` by default, such a row is
 * *owned by nobody and covered by no erasure path*.
 *
 * The window is closed on two sides, **not the three ADR-0007 describes**.
 * `databaseHooks.session.create.before` in `@repo/auth` refuses a session to a `users` row with no
 * `persons` row, and ADR-0007's sweep deletes unlinked `persons` rows older than an hour
 * (`abandonedSignups` in `@repo/consent` finds them; the job that runs it is ADR-0028's and is not
 * built).
 *
 * **The third side ADR-0007 assumes — "re-linkable by email on retry" — is not available, and
 * saying so is better than implying it.** `persons` holds no email: the address lives on
 * `users.email`, which is exactly the row that does not exist yet in this window, and ADR-0007's
 * own minimisation rules are why we would not add a second copy of it here. So a retry after a
 * failure **creates a new Person**, and the abandoned one waits for the sweep. The cost is real and
 * bounded: each failed attempt commits one `persons` row and its `consents` rows that nothing will
 * ever use. It is the price of the ordering, and the sweep is what pays it.
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
  /** Every signup box, ticked or not. A missing one is an error, never an inferred refusal. */
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

  /**
   * The instant the whole signup is stamped with — a `Date`, matching `createPerson` and
   * `recordSignupConsents` rather than `drainOutbox`'s `() => Date`.
   *
   * The distinction is real and worth keeping: a *thunk* is for a caller that samples the clock
   * repeatedly, as the drain does once per row, and this samples it **once** and hands the same
   * instant to the age gate, the Person and every consent. Passing a thunk here would let those
   * rows disagree about when the signup happened, which is exactly the timestamp an art. 9 dispute
   * turns on.
   */
  readonly now?: Date;
}

export interface SignUpResult {
  readonly person: Person;
  readonly userId: string;
}

/**
 * The date of birth is below the minimum age. Ley 1581 art. 7 is why the minimum exists.
 *
 * **English, and a condition rather than an argument** (ADR-0001 as amended). This message used to
 * be Spanish, on the reasoning that a person reads it. They do not: they read whatever `/signup`
 * renders when it catches this type. What reads *this* string is a log line, a Sentry issue and
 * whoever is on call — and a Spanish exception message makes the whole observability stack
 * unsearchable in the language the code is written in.
 *
 * It also used to cite the statute inline. The citation belongs here, where the reader is already
 * looking at the rule; a message that argues its own legal basis is prose in a field an operator
 * greps.
 *
 * The `name` is the contract the adapter matches on; the message is for the operator.
 */
export class UnderageSignUpError extends Error {
  readonly code = "SIGNUP_UNDERAGE";

  constructor() {
    super(`the date of birth is under the minimum age of ${String(MINIMUM_AGE_YEARS)}`);
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
  /**
   * **The union, not its own literal, because `SignUpAddressUnavailableError` narrows it.** A
   * subclass may not re-declare a property with a type its base rejects, so a bare
   * `readonly code = "SIGNUP_ACCOUNT_CREATION_FAILED"` here would make that subclass a compile
   * error. Widening is the honest reading anyway: a caller holding this type genuinely does not
   * know which of the two it has, and `instanceof` is how it finds out.
   */
  readonly code: "SIGNUP_ACCOUNT_CREATION_FAILED" | "SIGNUP_ADDRESS_UNAVAILABLE" =
    "SIGNUP_ACCOUNT_CREATION_FAILED";

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

/**
 * The credential provider reported success for an address that **already has an account**.
 *
 * **A distinct subclass, because the adapter has to treat this one differently from every other
 * failure and cannot be asked to guess which it has.** On Better Auth's enumeration-hardened path
 * (`autoSignIn: false`, ADR-0009) an already-registered address comes back as a *synthetic* user
 * that was never persisted — so this is the one failure that must render the **same neutral
 * "check your email" as success**, because *"does this person have an Encuentra account"* is itself
 * a signal about someone's employment situation.
 *
 * Everything else that lands in the parent class — a mailer that threw, a database that went away —
 * must **not** render that. Telling someone to check an inbox nothing will ever arrive in strands
 * them with no account and no way to know. Before this existed the two were one class, and the
 * adapter rendered the neutral message for both.
 */
export class SignUpAddressUnavailableError extends SignUpAccountCreationError {
  override readonly code = "SIGNUP_ADDRESS_UNAVAILABLE";

  constructor(personPublicId: string, cause: unknown) {
    super(personPublicId, cause);
    this.name = "SignUpAddressUnavailableError";
  }
}

export async function signUp(
  db: Db | Tx,
  input: SignUpInput,
  deps: SignUpDeps,
): Promise<SignUpResult> {
  const now = deps.now ?? new Date();

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

  /**
   * **Better Auth does not throw for an address that already exists — it returns a *synthetic*
   * user** (audit §5.5), because `autoSignIn: false` puts it on the enumeration-hardened path. That
   * user was never persisted, so linking to it would fail on the `persons.user_id → users.id`
   * foreign key with a message about a constraint, several frames from the thing that actually
   * happened.
   *
   * Checking turns the single most common signup failure into a typed error the adapter can render.
   * **It is not an enumeration hole**: nothing here learns *whose* address it was, and PR 2's
   * adapter shows the same neutral "check your email" either way — which is the whole point of the
   * hardened path, and would be undone by reporting "that address is taken".
   */
  const [account] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!account) {
    throw new SignUpAddressUnavailableError(
      person.publicId,
      // On Better Auth's enumeration-hardened path this is what an already-registered address
      // looks like: a success payload naming a user id no `users` row was written for.
      new Error("the credential provider returned a user id with no account row"),
    );
  }

  const linked = await linkToUser(db, person.publicId, userId);
  if (!linked) {
    // The Person was committed moments ago with an open seam, and `linkToUser` matches only an open
    // one — so this is a bug rather than a race. It leaves a `users` row that cannot sign in until
    // ADR-0007's sweep clears the Person, which is a state worth naming rather than returning a
    // half-built result for.
    throw new Error(
      `signUp: person ${person.publicId} could not be linked to user ${userId}; it was deleted or ` +
        `already linked`,
    );
  }

  return { person: linked, userId };
}
