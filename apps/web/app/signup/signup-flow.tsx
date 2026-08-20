"use client";

import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import { cn } from "@repo/design-system/lib/utils";
import type { Purpose } from "@repo/db/schema";
import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";

import { FOCUS_RING } from "../_landing/focus-ring";
import { signUpAction, type SignUpFailure } from "./actions";
import { CONSENT_CONSEQUENCE, PER_BOX_REFUSAL, type SignupBox } from "./copy";

/**
 * `/signup`, one decision per screen.
 *
 * **The shape is a prototype verdict, and a provisional one** —
 * `docs/design/signup-consent-prototype/` carries the two rounds and the reasoning. Round 2's finding
 * is the one that shaped this file: the last step is a **credential fork**, not a password field
 * (ADR-0009 line 105), and the flow costs six screens on the password branch. The fork's other two
 * branches belong to #71 and are rendered here as disabled, because a person deciding how to sign up
 * should see what the choices will be rather than meet them for the first time later.
 *
 * Three properties are load-bearing rather than stylistic.
 *
 * **Every box starts unticked and nothing is bundled.** The SIC's _Formatos modelo_ (2022) requires
 * each _finalidad_ to be separately selectable and D.1377 art. 7 forbids treating silence as consent.
 * The boxes come from `SIGNUP_PURPOSES` by way of the server page, so the form and
 * the rule cannot disagree about which Purposes exist.
 *
 * **A decision is submitted for every box, ticked or not.** Not the ticked ones — all of them.
 * `recordSignupConsents` rejects a set with a Purpose missing, and the completeness of that set is
 * what shows the box was rendered.
 *
 * **Refusing does not trap you.** A refused _finalidad_ advances to the next screen, and the wall is
 * the fork at the end. Stopping someone on screen three with no way forward and no sight of what they
 * would be giving up is worse than letting them reach the end and be told why.
 *
 * ADR-0017 does not test this file, and `CLAUDE.md` names the gap precisely: a form that silently
 * posted `isGranted: true` for every box would pass every test in this repository. The mitigation
 * here is that there is no place for such a bug to hide — `decisions` is one `useState` map keyed by
 * Purpose, written only by the two decision buttons, and passed through untouched.
 *
 * **`boxes` is a prop rather than an import, and that is a build constraint as much as a design
 * one.** `@repo/consent`'s `index.ts` re-exports `readAuthoredDocuments`, which reads `docs/legal/**`
 * off disk — so the barrel reaches `node:fs`, and importing anything from it here fails `next build`
 * with *"the chunking context does not support external modules"*. The server page resolves the
 * vocabulary and hands the list down, which is the better boundary anyway: the browser is not the
 * authority on which _finalidades_ exist.
 */

/**
 * **Three states, not two.** `undefined` is *not yet asked*, and it differs from `false`.
 *
 * A `Record<Purpose, boolean>` initialised to `false` cannot tell a refusal from a screen nobody has
 * reached — so somebody who refuses and presses "Volver" returns to a screen showing neither answer
 * selected, their decision indistinguishable from silence. That is the conflation D.1377 art. 7 is
 * about, arriving through a type.
 */
type Decisions = Partial<Record<Purpose, boolean>>;

/** `identity`, then one screen per Purpose, then the fork, then the credential. */
type Step =
  | { kind: "identity" }
  | { kind: "purpose"; index: number }
  | { kind: "fork" }
  | {
      kind: "password";
    };

interface Draft {
  fullName: string;
  dateOfBirth: string;
  email: string;
  password: string;
}

const EMPTY_DRAFT: Draft = { fullName: "", dateOfBirth: "", email: "", password: "" };

/**
 * **Where a `SignUpFailure` becomes Spanish, and the only place it does** (ADR-0001, amended).
 *
 * The Server Action returns a code; this is the UI owning the translation. `satisfies` keeps it
 * exhaustive, so adding a failure to the union fails to compile here rather than rendering
 * `undefined` at somebody who just failed to create an account.
 *
 * The wording is deliberately not a translation of the error's own message. `underage` throws
 * *"the date of birth is under the minimum age of 18 (Ley 1581 art. 7)"*, which is exactly right for
 * a log line and exactly wrong for a person — so this says the thing they can act on and cites
 * nothing.
 */
const SIGNUP_FAILURE_COPY = {
  "malformed-submission": "No pudimos leer el formulario. Vuelve a intentarlo.",
  underage: "Necesitas tener 18 años o más para crear una cuenta.",
  "consent-incomplete":
    "Para crear la cuenta necesitamos que autorices las tres finalidades. Vuelve atrás y revisa " +
    "tus respuestas.",
  unavailable: "Algo salió mal de nuestro lado y no pudimos crear la cuenta. Vuelve a intentarlo.",
} as const satisfies Record<SignUpFailure, string>;

export function SignupFlow({ boxes }: { boxes: readonly SignupBox[] }) {
  const [step, setStep] = useState<Step>({ kind: "identity" });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // Starts genuinely empty. Nothing is pre-ticked, and nothing is pre-refused either.
  const [decisions, setDecisions] = useState<Decisions>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // `!== true` rather than `!`, so *undecided* counts as missing exactly as a refusal does — both
  // mean "we hold no authorisation for this", which is what the gate is asking.
  const missing = useMemo(
    () => boxes.filter((box) => decisions[box.purpose] !== true),
    [boxes, decisions],
  );

  // Six on the password branch, five on the two #71 branches — see the prototype README.
  const total = boxes.length + 3;
  const position =
    step.kind === "identity"
      ? 1
      : step.kind === "purpose"
        ? step.index + 2
        : step.kind === "fork"
          ? boxes.length + 2
          : total;

  function go(next: Step) {
    setError(null);
    setStep(next);
    // Moving between screens in a client component changes no URL, so a screen reader is told
    // nothing unless we say so. Focus follows the new heading, which is also what puts a keyboard
    // user at the top of the step rather than back at the browser chrome.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction({ ...draft, decisions });
      if (result.ok) {
        setDone(true);
        return;
      }
      setError(SIGNUP_FAILURE_COPY[result.failure]);
    });
  }

  if (done) return <CheckYourMail email={draft.email} />;

  return (
    <div>
      <Progress position={position} total={total} />

      {step.kind === "identity" ? (
        <IdentityStep
          headingRef={headingRef}
          draft={draft}
          onChange={setDraft}
          onNext={() => go({ kind: "purpose", index: 0 })}
        />
      ) : null}

      {step.kind === "purpose" ? (
        <PurposeStep
          headingRef={headingRef}
          box={boxes[step.index]!}
          decision={decisions[boxes[step.index]!.purpose]}
          onDecide={(isGranted) => {
            setDecisions((d) => ({ ...d, [boxes[step.index]!.purpose]: isGranted }));
            go(
              step.index + 1 < boxes.length
                ? { kind: "purpose", index: step.index + 1 }
                : { kind: "fork" },
            );
          }}
          onBack={() =>
            go(step.index === 0 ? { kind: "identity" } : { kind: "purpose", index: step.index - 1 })
          }
        />
      ) : null}

      {step.kind === "fork" ? (
        <ForkStep
          headingRef={headingRef}
          missing={missing}
          onPassword={() => go({ kind: "password" })}
          onBack={() => go({ kind: "purpose", index: boxes.length - 1 })}
        />
      ) : null}

      {step.kind === "password" ? (
        <PasswordStep
          headingRef={headingRef}
          draft={draft}
          onChange={setDraft}
          onSubmit={submit}
          pending={pending}
          error={error}
          onBack={() => go({ kind: "fork" })}
        />
      ) : null}
    </div>
  );
}

function Progress({ position, total }: { position: number; total: number }) {
  return (
    <div className="mb-6">
      <p className="text-muted-foreground mb-2 text-xs">
        Paso {position} de {total}
      </p>
      {/* Decorative: the sentence above already says it, and a row of divs says it worse. */}
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn("h-[3px] flex-1 rounded-full", i < position ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeading({
  headingRef,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className={cn(
        "font-heading mb-2 text-xl leading-tight font-semibold tracking-tight",
        FOCUS_RING,
        "rounded-sm",
      )}
    >
      {children}
    </h2>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        "text-muted-foreground mt-3 rounded-sm px-1 py-2 text-sm underline underline-offset-4",
        FOCUS_RING,
      )}
    >
      ← Volver
    </button>
  );
}

function IdentityStep({
  headingRef,
  draft,
  onChange,
  onNext,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  draft: Draft;
  onChange: (d: Draft) => void;
  onNext: () => void;
}) {
  const nameId = useId();
  const dobId = useId();
  const ready = draft.fullName.trim().length > 0 && draft.dateOfBirth.length > 0;

  return (
    <div>
      <StepHeading headingRef={headingRef}>¿Cómo te llamas?</StepHeading>
      {/* The name is typed by the person, always (ADR-0009) — and saying why here is what makes it
          read as a choice rather than a chore. It matters more once #71 lands: a provider profile
          name is frequently a nickname, and this is the string a stranger reads on a proposal. */}
      <p className="text-muted-foreground mb-6 text-[0.9375rem]">
        Tu nombre lo escribes tú. Es el que verá una persona desconocida al recibir tu propuesta,
        así que escríbelo como quieres que te llamen.
      </p>

      <div className="mb-5">
        <Label htmlFor={nameId}>Nombre completo</Label>
        <Input
          id={nameId}
          className="mt-1.5"
          value={draft.fullName}
          autoComplete="name"
          onChange={(e) => onChange({ ...draft, fullName: e.target.value })}
        />
      </div>

      <div className="mb-6">
        <Label htmlFor={dobId}>Fecha de nacimiento</Label>
        {/* Stated at the point of asking, because a date of birth is the field people most reasonably
            resent being asked for. ADR-0007 keeps it off the `Person` type entirely: written, checked
            once by the 18+ gate, and never handed back. */}
        <p className="text-muted-foreground mt-1 text-sm">
          Solo para verificar que tienes 18 años o más. No se muestra nunca, no aparece en tu perfil
          y no sirve para filtrar búsquedas.
        </p>
        <Input
          id={dobId}
          type="date"
          className="mt-1.5"
          value={draft.dateOfBirth}
          autoComplete="bday"
          onChange={(e) => onChange({ ...draft, dateOfBirth: e.target.value })}
        />
      </div>

      {/* **Disabled here, and pressed-and-explained at the consent gate** — the difference is which
          kind of incompleteness it is. Two empty text fields are visible on the same screen with a
          hint under the button naming them, so nothing is hidden. A missing *authorisation* is a
          decision three screens back, which is why `ForkStep` never disables and says what is
          missing instead. */}
      <Button size="lg" className="w-full" onClick={onNext} disabled={!ready}>
        Continuar
      </Button>
      {!ready ? (
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Escribe tu nombre y tu fecha de nacimiento para continuar.
        </p>
      ) : null}

      {/* **The documents a person is about to consent against, linked before they decide anything.**
          Recording consent against a _política_ the form never offered a route to is the art. 12
          failure the whole evidence trail exists to prevent — the disclosure text itself links to
          both, and until this PR neither had a page to link to. They open in a new tab so that
          reading one does not throw away a half-filled form: this flow holds its state in memory and
          navigating away loses it. */}
      <p className="text-muted-foreground mt-6 border-border border-t pt-5 text-sm">
        Antes de decidir puedes leer nuestra{" "}
        <a
          href="/legal/processing-policy"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          política de tratamiento de datos
        </a>{" "}
        y el{" "}
        <a
          href="/legal/privacy-notice"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          aviso de privacidad
        </a>
        . Guardamos la versión exacta que estaba vigente el día que creaste tu cuenta.
      </p>
    </div>
  );
}

function PurposeStep({
  headingRef,
  box,
  decision,
  onDecide,
  onBack,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  box: SignupBox;
  /** `undefined` until this screen has been answered — see `Decisions`. */
  decision: boolean | undefined;
  onDecide: (isGranted: boolean) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeading headingRef={headingRef}>{box.title}</StepHeading>
      {/* The full _finalidad_, always visible. One decision per screen is what buys the room for it —
          this is the art. 12 _información previa_, and folding it behind a disclosure here would hide
          the only thing the screen exists for. That is also why `PurposeCopy` has no one-line
          summary: round 1's prototype had one for a `<details>` that variant C does not use, and a
          second wording of a legal sentence that nothing renders is a liability, not a spare. */}
      <p className="text-muted-foreground mb-6 text-[0.9375rem]">{box.detail}</p>

      {/* **Two controls of equal weight**, which is a rule rather than a preference:
          `packages/design-system/README.md` forbids a filled primary beside a ghosted escape on a
          consent surface, because ADR-0025 and D.1377 art. 6 both treat conditioning that arrives
          through CSS as conditioning. Both are the same component with the same styling.

          **`aria-pressed` reflects a refusal too.** It was hardcoded `false` on "No autorizo", so
          returning to an answered screen showed a refusal as though nothing had been chosen. */}
      <div className="grid gap-2.5">
        <DecisionButton pressed={decision === true} onClick={() => onDecide(true)}>
          <span className="font-semibold">Sí, autorizo</span>
        </DecisionButton>
        <DecisionButton pressed={decision === false} onClick={() => onDecide(false)}>
          <span className="font-semibold">No autorizo</span>
          <span className="text-muted-foreground text-sm">{PER_BOX_REFUSAL}</span>
        </DecisionButton>
      </div>

      <BackLink onBack={onBack} />
    </div>
  );
}

function DecisionButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "border-input grid w-full gap-0.5 rounded-lg border p-3.5 text-left",
        "hover:bg-accent",
        pressed && "border-primary bg-primary/5 ring-primary ring-1",
        FOCUS_RING,
      )}
    >
      {children}
    </button>
  );
}

function ForkStep({
  headingRef,
  missing,
  onPassword,
  onBack,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  missing: readonly { purpose: Purpose; title: string }[];
  onPassword: () => void;
  onBack: () => void;
}) {
  const blocked = missing.length > 0;

  return (
    <div>
      <StepHeading headingRef={headingRef}>¿Cómo vas a entrar?</StepHeading>

      {/* **The gate is here, and it has to be.** #71 puts Google and Facebook on this screen, and a
          tap on one of those *is* the OAuth redirect — consent must precede it, because Better Auth's
          own documentation makes OAuth `state` untrusted, so it cannot carry the evidence back. The
          same wall therefore stands in front of all three choices rather than in front of the
          password branch alone. */}
      {blocked ? (
        <div
          role="alert"
          className="border-warning-border bg-warning-surface text-warning mb-5 rounded-lg border p-3.5 text-sm"
        >
          <strong className="mb-1 block text-[0.9375rem] font-semibold">
            {missing.length === 1
              ? "Falta una autorización para poder continuar"
              : `Faltan ${missing.length} autorizaciones para poder continuar`}
          </strong>
          {CONSENT_CONSEQUENCE}
          <ul className="mt-1.5 list-disc pl-5">
            {missing.map((box) => (
              <li key={box.purpose}>{box.title}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground mb-5 text-[0.9375rem]">
        Ya está lo importante. Ahora elige cómo vas a entrar.
      </p>

      <div className="grid gap-2.5">
        {/* #71. Rendered rather than hidden: someone choosing how to sign up should see what the
            choices will be, and finding out later that there was an easier way is worse than being
            told now that it is coming. */}
        <SocialPlaceholder label="Continuar con Google" />
        <SocialPlaceholder label="Continuar con Facebook" />

        <Button size="lg" className="w-full" onClick={onPassword} disabled={blocked}>
          Crear una contraseña
        </Button>
      </div>

      <BackLink onBack={onBack} />
    </div>
  );
}

function SocialPlaceholder({ label }: { label: string }) {
  return (
    <div className="border-border text-muted-foreground rounded-lg border border-dashed p-3.5 text-sm">
      <span className="block font-medium">{label}</span>
      <span>Todavía no está disponible. Por ahora, crea una contraseña.</span>
    </div>
  );
}

function PasswordStep({
  headingRef,
  draft,
  onChange,
  onSubmit,
  pending,
  error,
  onBack,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  draft: Draft;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const emailId = useId();
  const passwordId = useId();
  const ready = draft.email.length > 0 && draft.password.length >= 8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <StepHeading headingRef={headingRef}>Elige tu contraseña</StepHeading>
      <p className="text-muted-foreground mb-6 text-[0.9375rem]">
        Con tu correo es como vuelves a entrar, y es la única forma de recuperar la cuenta si
        olvidas la contraseña.
      </p>

      {error ? (
        <div
          role="alert"
          className="border-destructive-border bg-destructive-surface text-destructive mb-5 rounded-lg border p-3.5 text-sm"
        >
          {error}
        </div>
      ) : null}

      <div className="mb-5">
        <Label htmlFor={emailId}>Correo electrónico</Label>
        <Input
          id={emailId}
          type="email"
          className="mt-1.5"
          value={draft.email}
          autoComplete="email"
          onChange={(e) => onChange({ ...draft, email: e.target.value })}
        />
      </div>

      <div className="mb-6">
        <Label htmlFor={passwordId}>Contraseña</Label>
        <p className="text-muted-foreground mt-1 text-sm">Mínimo 8 caracteres.</p>
        <Input
          id={passwordId}
          type="password"
          className="mt-1.5"
          value={draft.password}
          autoComplete="new-password"
          onChange={(e) => onChange({ ...draft, password: e.target.value })}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!ready || pending}>
        {pending ? "Creando tu cuenta…" : "Crear cuenta"}
      </Button>

      {/* Said before it happens rather than only afterwards. `autoSignIn: false` is what buys
          ADR-0009's enumeration hardening, so the extra step is deliberate — and a person who is
          told to expect it does not read it as the form having failed. */}
      <p className="text-muted-foreground mt-3 text-center text-sm">
        Después de crear la cuenta entras con la contraseña que acabas de elegir.
      </p>

      <BackLink onBack={onBack} />
    </form>
  );
}

/**
 * The one screen both a real signup and an already-registered address arrive at.
 *
 * That identity is the point (ADR-0009): *"does this person have an Encuentra account"* is a signal
 * about someone's employment situation, so the two cases may not be told apart from out here. It also
 * means this copy must not promise more than it can keep — it says a message was sent, not that an
 * account was created.
 */
function CheckYourMail({ email }: { email: string }) {
  return (
    <div className="border-success-border bg-success-surface rounded-lg border p-5">
      <h2 className="font-heading text-success mb-2 text-lg font-semibold">Revisa tu correo</h2>
      <p className="mb-3 text-[0.9375rem]">
        Si esa dirección todavía no tenía una cuenta, te enviamos un mensaje a{" "}
        <strong>{email}</strong> para verificarla.
      </p>
      <p className="mb-4 text-[0.9375rem]">
        Ahora entra con la contraseña que elegiste. Si el mensaje no llega, míralo en la carpeta de
        spam.
      </p>
      <Button size="lg" render={<Link href="/signin" />} nativeButton={false}>
        Ir a entrar
      </Button>
    </div>
  );
}
