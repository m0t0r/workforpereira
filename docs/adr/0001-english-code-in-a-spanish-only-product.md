# English in code, Spanish in the UI

Encuentra ships in Spanish only, with no i18n in v1, which is a real argument for Spanish
identifiers — one language, no translation seam. We chose **English for all code, database columns,
routes and file names, with Spanish confined to UI copy**, because the three Spanish words we would
most need are already taken by Colombian labour law and everyday usage, in ways that would import
permanent ambiguity into the schema.

## Why

- **`oferta`** colloquially means the *job posting* ("oferta laboral"). Our `Offer` is a proposal of
  work sent to a specific person — very nearly the opposite.
- **`oferente`** is the Servicio Público de Empleo's term for the *job seeker*
  (`Decreto 1072` `2.2.6.1.2.17`). A field named `oferente` would mean the inverse of what a reader
  would assume from our `Offer`.
- **`colocación`** and **`remisión`** name the exact regulated activities that make SPE
  authorisation a live question (see issue #23). Using them as code words would embed a legal claim
  about what the platform does into the schema.

`CONTEXT.md` carries the Spanish word for each term, so UI copy stays consistent without the
schema inheriting the baggage.

## Exceptions

A small set of legal terms of art stay Spanish everywhere, because translating them severs the tie
to the statute they come from: `titular`, `finalidad`, `reclamo`, `consulta`, `aviso de privacidad`,
`política de tratamiento`.
