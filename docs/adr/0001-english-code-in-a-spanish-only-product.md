# English in code, Spanish in the UI

Encuentra ships in Spanish only, with no i18n in v1, which is a real argument for Spanish
identifiers — one language, no translation seam. We chose **English for all code, database columns,
routes and file names, with Spanish confined to UI copy**, because the three Spanish words we would
most need are already taken by Colombian labour law and everyday usage, in ways that would import
permanent ambiguity into the schema.

## Why

- **`oferta`** colloquially means the _job posting_ ("oferta laboral"). Our `Offer` is a proposal of
  work sent to a specific person — very nearly the opposite.
- **`oferente`** is the Servicio Público de Empleo's term for the _job seeker_
  (`Decreto 1072` `2.2.6.1.2.17`). A field named `oferente` would mean the inverse of what a reader
  would assume from our `Offer`.
- **`colocación`** and **`remisión`** name the exact regulated activities that make SPE
  authorisation a live question (see issue #23). Using them as code words would embed a legal claim
  about what the platform does into the schema.

`CONTEXT.md` carries the Spanish word for each term, so UI copy stays consistent without the
schema inheriting the baggage.

## Exceptions

A small set of legal terms of art stay Spanish, because translating them severs the tie to the
statute they come from: _titular_, _finalidad_, _reclamo_, _consulta_, _aviso de privacidad_,
_política de tratamiento_.

**Amended (issue #21): the exception covers prose and UI copy, and nothing else.** As first written
it said these terms stay Spanish _everywhere_, which would have put `reclamo` and `consulta` in a
`pgEnum`, `politica` and `aviso` in a document-kind column, and Spanish slugs in the URL space. That
is the wrong trade. A rule that admits Spanish on a six-word allowlist is a rule someone has to
remember, and the cost of forgetting it is a codebase in two languages — while the statutory tie it
buys is preserved just as well by a comment.

So the exception applies to **`CONTEXT.md` and ADR prose**, where these are the words for the
concepts, and to **UI copy**, per the main rule.

It does **not** apply to enum values, column names, table names, file slugs, routes, or any other
identifier. Those are English, with the Spanish term and its article alongside:

```sql
kind text not null  -- processing_policy = política de tratamiento, D.1377 art. 13
```

The cost this accepts is real and worth naming: the _política de tratamiento_ and the _aviso de
privacidad_ are two documents with **different** statutory contents (D.1377 art. 13 vs arts. 14–15),
and the English pair "processing policy" / "privacy notice" reads to an English speaker like two
names for one thing. The route slugs are `/legal/processing-policy` and `/legal/privacy-notice`; each
page's own heading carries the Spanish statutory name, which is where a reader who needs the
distinction will actually be looking.

## Errors, logs and observability are English, and the UI translates

**Amended (issue #70): an error is never UI copy, wherever it eventually surfaces. Spanish is
produced at the point of rendering and nowhere earlier.**

The main rule says Spanish is confined to "what a user reads", and an error message looks like it
qualifies — somebody does eventually read one. That reasoning is what put a Spanish sentence inside
`UnderageSignUpError` and installed `@better-auth/i18n` so the auth API returned translated
`$ERROR_CODES`. Both are now reverted, because the reasoning is wrong twice over.

**An error is read by four things before it is read by a person**: a log line, an alert, a Sentry
issue, and whoever is on call at the time. Translating it at the point it is _thrown_ translates all
four, and the result is an observability stack in a language the code is not written in — ungreppable
by the identifiers around it, and unreadable to any future contributor or vendor tool that does not
speak Spanish. The person who most needs to understand an error at 3am is not the Titular.

**And the thing the user reads is not the message anyway.** It is whatever the surface renders when
it catches the type or matches the code. Those are different strings with different jobs: one names a
condition precisely for an engineer, the other says something kind and actionable to somebody who
just failed to create an account. Collapsing them makes both worse — the log gets a sentence about
being sorry, and the screen gets a sentence about `art. 7`.

So, concretely:

- **Thrown messages, `Error.name`, log lines, Sentry breadcrumbs and job output are English.** The
  class name is the contract a caller matches on; the message is for the operator.
- **The API returns codes, not prose.** Better Auth already emits stable codes — `TOKEN_EXPIRED`,
  `INVALID_EMAIL_OR_PASSWORD`, `USER_ALREADY_EXISTS` — and a Server Action returns a discriminated
  literal of its own. A code is matchable and a sentence is not, which is why this is better than
  translation even setting the logs aside.
- **The UI owns every Spanish string, and owns it at the point of rendering.** It may say something
  quite different from the code it matched, which is usually right: the product's voice is not the
  provider's.
- **A translated string never travels.** It is not stored, not logged, not returned from a module,
  and never crosses a package boundary.

This does not narrow the main rule so much as finish the sentence it left open. "UI copy" means
words chosen for a person on a screen — not every word a person might one day be shown a rendering
of.

### An error message states the condition, not the case for the rule

**Amended (issue #70, second pass): an `Error` message names what happened and the values it
happened to. It does not cite an ADR, a statute or a decree, and it does not explain why the rule
exists.**

The amendment above got the language right and the _register_ wrong. Having established that the
message is for the operator, it went on to write messages that argue:

> `every Purpose asked at /signup must carry a decision, and news carried none. A refusal is a
decision; silence is not (D.1377 art. 7).`

Four things are wrong with that, and none of them are about taste:

- **A citation in a message is a claim that outlives its source.** `D.1377 art. 7` is pinned into a
  string that is thrown, logged, retained and — if it ever reaches a client — quoted back. Amend the
  ADR, renumber the article, or lose the reasoning, and the string is still asserting it. A comment
  is versioned with the code and read by whoever is changing it; a message is not.
- **An ADR number means nothing outside this repository.** The message travels to Sentry, to a log
  aggregator, to a vendor's dashboard, into a support ticket. `ADR-0021` is a dangling reference
  everywhere except here.
- **It is at the wrong altitude for its only reader.** An operator at 3am wants the condition and the
  operands — _which_ purposes, _which_ row, _which_ file. The paragraph after it costs them the scan.
- **It is unmatchable and unstable.** Anything downstream that keys off the text breaks when the
  prose is improved, which invites improving the prose less often than the reasoning changes.

So an error message is: the condition, the identifiers involved, and nothing else.

```ts
// no
`${refused.join(", ")} is required and was refused, so there is no account. Nothing lawful
 remains to do — Colombia has no legitimate-interest basis (ADR-0007).`
// yes
`required consent refused for: ${refused.join(", ")}`;
```

**The reasoning does not disappear — it moves one line up**, into the doc comment on the error class,
where the citation is versioned alongside the rule and read by the person changing it. That is
strictly better placement, not a loss: the class already exists, it already has a name, and its
comment is the natural home for _why this is a refusal at all_.

**Since the message is no longer the contract, something else has to be.** Every error class
carries a `readonly code` — a `SCREAMING_SNAKE_CASE` literal, unique across the repository, declared
as a field so TypeScript infers the literal type and `error.code` narrows:

```ts
export class RequiredConsentRefusedError extends Error {
  readonly code = "CONSENT_REQUIRED_REFUSED";
  constructor(readonly refused: readonly string[]) { … }
}
```

`SCREAMING_SNAKE_CASE` because it is the register Better Auth's `$ERROR_CODES` already emit into this
stack (`USER_ALREADY_EXISTS`, `TOKEN_EXPIRED`), and codes that travel together should look alike.

This is a **second, weaker contract standing beside `instanceof`, not a replacement for it.**
`instanceof` stays the in-process mechanism: it narrows the type, it survives a subclass relationship
that a string comparison cannot express, and the compiler checks the class name where it cannot check
a literal for a typo. What the code adds is a _portable_ identifier — one that survives a `structuredClone`
across a Server Action boundary, a Sentry tag, a log field and a support ticket, where the class does
not. **Where a subclass narrows the code, the base declares the union** — a subclass may not
re-declare a property with a type its base rejects, and widening is the honest reading anyway, since a
caller holding the base genuinely does not know which it has.

**The code is not what the API returns.** A Server Action still answers with its own discriminated
literal (`SignUpFailure`), chosen for the surface rather than for the thrower — the two are different
vocabularies at different altitudes, and collapsing them would leak every internal failure mode onto
the wire. The code is what an operator greps and what an alert groups on.

Three carve-outs, each because the reader is different:

- **A configuration error at boot may carry its remediation.** `APP_URL is not set. It is the origin
this application is served from` is read once, by a developer or a deploy log, at the moment the
  process refuses to start. It still cites nothing.
- **Developer-facing gate and CLI output is a report, not an error.** `pnpm db:check`'s
  `Violation.message` exists to send someone to a decision, so it names the ADR — acting on it means
  reading that ADR. The distinction is the type: a `Violation` is printed to a terminal by a tool
  someone just ran; an `Error` is thrown into a system.
- **`cause` carries the provider's own words unchanged.** Wrapping is not editing.

## Prototype and tooling chrome

**Amended (issue #30): a prototype's own controls are English. Only the copy inside the thing being
prototyped is Spanish.**

The main rule confines Spanish to "UI copy", and a prototype breaks that phrase in half. A
`/prototype` artifact renders two things on one screen: the product surface under review, whose
words are the design, and the harness around it — variant switcher, toggles, state readout, banner —
whose words are instrumentation. The first is UI copy. **The second is not, and never becomes it:**
it is deleted when the prototype is captured, so no Spanish string in it will ever reach a user.

So `Publication · profile | need`, `Cap · counter | hard stop | choose`, `Suggestion · after search |
always`, `Reset`. Not `Objeto`, `Tope`, `Sugerencia`, `Reiniciar`.

Two reasons beyond consistency:

- **The switcher's search-param values are identifiers**, and the amendment above already puts every
  identifier in English. `?cap=hard-stop` and `?cap=tope` differ in nothing but which rule you
  noticed. A prototype whose controls are Spanish tends to grow Spanish state keys behind them —
  `state.cap === "elegir"` — which is the two-language codebase this ADR exists to prevent, arriving
  through a file nobody thought counted.
- **Spanish chrome camouflages itself as design.** The harness is supposed to be visibly not part of
  the thing being judged; sharing the product's language is the one way to blur that on a screen
  where every other signal (dark pill, monospace, fixed position) is trying to keep it separate.

The rule reaches every developer-facing surface the same way: prototype switchers, seed and fixture
scripts, CLI output, log messages, test names, commit messages. `docs/design/skill-picker-prototype/`
is the worked example.
