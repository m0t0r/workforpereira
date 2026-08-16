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
