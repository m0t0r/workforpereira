"use server";

import {
  MissingConsentDecisionError,
  RequiredConsentRefusedError,
  SIGNUP_PURPOSES,
} from "@repo/consent";
import { getDb } from "@repo/db";
import type { Purpose } from "@repo/db/schema";

import { getAuth } from "@/src/auth";
import { subjectKeySecret } from "@/src/env";
import {
  signUp,
  SignUpAddressUnavailableError,
  UnderageSignUpError,
  type SignUpInput,
} from "@/src/use-cases/sign-up";

/**
 * The Server Action over `signUp`.
 *
 * **An adapter, not a seam** (ADR-0017): auth → parse → call. It is deliberately not tested, and the
 * rule that keeps that honest is that it contains no logic worth testing. Everything the law turns
 * on — the ordering, the consent rows, the age gate — is in the use case underneath.
 *
 * There is no `revalidatePath` and no actor. The recipe's shape assumes a signed-in Person changing
 * something they can see; here the Person does not exist when the action starts, and nothing that is
 * currently rendered changes as a result of it.
 *
 * **The Sentry wrapper is missing, and it is missing on purpose.** `docs/module-package-recipe.md`
 * §10 requires `Sentry.withServerActionInstrumentation()` around every Server Action, and ADR-0006
 * explains why: Sentry instruments Server Components through `onRequestError` but reports nothing
 * from an unwrapped action, so this use case would be invisible in production. `@sentry/nextjs` is
 * not a dependency of this repository and nothing configures it — **#73 owns wiring observability**.
 * Installing it here would be doing that ticket's work, and a wrapper around a Sentry that is never
 * initialised would look like compliance without being it. When #73 lands, this function gets the
 * wrapper and this paragraph goes away.
 */

/**
 * What crosses from the browser. `unknown` rather than a typed parameter, because a Server Action's
 * argument is whatever the network sent — the type annotation would be a claim, not a check.
 */
/**
 * Why a signup did not complete, as a **code rather than a sentence** (ADR-0001, amended).
 *
 * A Server Action is an API boundary, and an API boundary does not speak Spanish. What crosses is a
 * literal the client matches on; `signup-flow.tsx` owns what a person actually reads, and may say
 * something quite different from what this names.
 *
 * Three reasons this is better than returning the message, and only the first is about language:
 * the string a log wants and the string a frightened person wants are different strings; a code is
 * matchable where a sentence is not, so the client can render markup, a link or a step back rather
 * than a paragraph; and a translated string that travels is one that ends up stored, logged and
 * compared against.
 */
export type SignUpFailure =
  /** The submission was not the shape the action accepts. A broken client, not a person's mistake. */
  | "malformed-submission"
  /** Under the minimum age. The one refusal that must be said plainly. */
  | "underage"
  /** A required Purpose was refused or missing. Unreachable from the stepped form; see below. */
  | "consent-incomplete"
  /** Ours: the database, the mailer, an unseeded disclosure. */
  | "unavailable";

export type SignUpActionResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure: SignUpFailure;
    };

class InvalidSignUpSubmission extends Error {
  readonly code = "SIGNUP_SUBMISSION_INVALID";

  constructor(what: string) {
    super(`signUpAction: ${what}`);
    this.name = "InvalidSignUpSubmission";
  }
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string") throw new InvalidSignUpSubmission(`${key} is not a string`);
  return value;
}

/**
 * Hand-written because there is no `zod` in this repository, and the recipe's `Input.parse(input)`
 * assumes one. What matters is that it is a **check** rather than a cast: every field is proven to
 * be the shape the use case's type claims, and the `decisions` array is proven to be exactly the
 * signup set with a boolean each.
 *
 * **The decisions are not filtered to the ticked ones**, and this is the line that would be easiest
 * to write wrongly. `recordSignupConsents` rejects a set with a Purpose missing — a decision for
 * every box is what shows the box was rendered and separately selectable (D.1377 art. 7), and
 * silently dropping the unticked ones would turn a refusal into a box we never asked about.
 */
function parse(input: unknown): SignUpInput {
  if (typeof input !== "object" || input === null) {
    throw new InvalidSignUpSubmission("the submission is not an object");
  }
  const source = input as Record<string, unknown>;

  const rawDecisions = source["decisions"];
  if (typeof rawDecisions !== "object" || rawDecisions === null) {
    throw new InvalidSignUpSubmission("decisions is not an object");
  }
  const decisionsByPurpose = rawDecisions as Record<string, unknown>;

  const decisions = SIGNUP_PURPOSES.map((purpose: Purpose) => {
    const isGranted = decisionsByPurpose[purpose];
    if (typeof isGranted !== "boolean") {
      // Not defaulted to `false`. An absent decision is a broken client, and treating it as a
      // refusal would be inferring consent's opposite from silence just as surely as the other
      // direction infers consent — both are the thing D.1377 art. 7 forbids us from doing.
      throw new InvalidSignUpSubmission(`no decision was submitted for ${purpose}`);
    }
    return { purpose, isGranted };
  });

  return {
    fullName: requireString(source, "fullName").trim(),
    dateOfBirth: requireString(source, "dateOfBirth"),
    email: requireString(source, "email"),
    password: requireString(source, "password"),
    decisions,
  };
}

/**
 * **Four outcomes, and telling them apart is the whole of this function.**
 *
 * `SignUpAddressUnavailableError` is what an already-registered address looks like: Better Auth
 * returns a hardened fake-success payload on the `autoSignIn: false` path (ADR-0009) and `signUp`
 * turns the unpersisted user into this error. It renders the **same neutral "check your email" as
 * success**, because *"does this person have an Encuentra account"* is itself a signal about
 * someone's employment situation, and reporting it back would undo the hardening in one line.
 *
 * **Its parent class must not be caught here, and that distinction is load-bearing.**
 * `SignUpAccountCreationError` also covers a mailer that threw and a database that went away.
 * Rendering "check your email" for those strands somebody with no account and no way to know — so
 * only the subclass gets the neutral response and the parent falls through to the error below.
 *
 * `UnderageSignUpError` is said plainly. It is a refusal the person can act on, it leaks nothing
 * about anybody else, and a silent "check your email" that never arrives would be the cruellest
 * possible response to it.
 *
 * **A refused or missing consent is the person's decision, not our fault**, so it may not render
 * "algo salió mal de nuestro lado". The stepped form makes this state unreachable — every screen
 * requires a choice before it advances — which is exactly why it is worth handling: the branch only
 * runs if something client-side is wrong, and blaming the platform for the person's own decision
 * would be the wrong thing to say in the one case nobody tested.
 *
 * Everything else is ours, said as ours, and leaks nothing about any address — it is what a person
 * with a brand-new address sees too.
 */
export async function signUpAction(input: unknown): Promise<SignUpActionResult> {
  let parsed: SignUpInput;
  try {
    parsed = parse(input);
  } catch {
    return { ok: false, failure: "malformed-submission" };
  }

  const auth = getAuth();

  try {
    await signUp(getDb(), parsed, {
      createAuthUser: async (_db, user) => {
        const created = await auth.api.signUpEmail({ body: user });
        return { userId: created.user.id };
      },
      subjectKeySecret: subjectKeySecret(),
    });
  } catch (error) {
    if (error instanceof UnderageSignUpError) {
      return { ok: false, failure: "underage" };
    }

    if (error instanceof SignUpAddressUnavailableError) {
      // The hardened path, and *only* it. Indistinguishable from success by design — see above.
      return { ok: true };
    }

    if (
      error instanceof RequiredConsentRefusedError ||
      error instanceof MissingConsentDecisionError
    ) {
      return { ok: false, failure: "consent-incomplete" };
    }

    // Logged in English where a person cannot read it, which is the other half of the same rule —
    // this line is for whoever is on call. #73 replaces it with Sentry.
    console.error("signUpAction failed", error);
    return { ok: false, failure: "unavailable" };
  }

  return { ok: true };
}
