# Prototype — the operator surface, and how a Photo is judged (#28)

Throwaway. Open `index.html` in a browser; there is nothing to install and nothing to run.

## The question

Only one, because the grilling session settled everything else before this file existed: **one
internal surface, a sidebar with four links, each carrying a count.**

What was left open is how an operator judges a single photograph:

| `?view=` |                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `single` | One photo at a time. **Proposed.**                                                                       |
| `sheet`  | A contact sheet of twelve. The faster alternative, built so it can be argued with rather than dismissed. |

Two supporting toggles, because both change what the surface has to say: `?age=late` puts the queue
past ADR-0010's three days, and `?repeat=on` shows a person's second refusal on the same code.

## What it is trying to show

**The mount, inverted.** The [#29 prototype](../photo-refusal-prototype/) set the refusal _inside_ a
photo-proportioned frame with a mat inset, because ADR-0010 destroys the rejected bytes and the
message is therefore about something neither party can see — the reason lived in the space where the
photo is not. Here the same rectangle holds the photograph. It is the one surface in the product
where the mount is full, and the decision is made inside it.

**The operator picks a sentence, not a code.** The six options render as the **Spanish text the
person will receive**, at reading size, in the body face, with the English identifier set small
beside them. ADR-0027 authored that vocabulary copy-first precisely because a list written for an
operator's queue — `INVALID`, `LOW_QUALITY` — translates into the sentence that ADR exists to avoid.
A picker showing codes quietly undoes the argument. Selecting one also reveals **what actually
leaves the building**: the imperative half, which is all the email carries.

`not_for_work` and `face_not_visible` share one imperative word for word, and the prototype says so
on the card rather than leaving it to look like a copy-paste error. It is the control that stops the
email being read backwards to the code.

**Where the log happens.** The line under the mount states that opening the photo was recorded. The
logged act is the issuance of the signed URL — the only moment a face actually reaches the screen.

## Language

The operator surface is **Spanish**, like every other surface a person reads. This file's own chrome
— the bar at the bottom, the state readout, the note on the contact sheet — is **English**, per
ADR-0001 as amended by #30: a prototype's controls are chrome, and Spanish chrome grows Spanish state
keys. Identifiers are English everywhere: `pending`, `face_not_visible`, `shortlisted`.

## Tokens

**ADR-0029's, copied verbatim** from `packages/design-system/src/styles/globals.css`. This is the
first prototype in the repo with a real token layer to build on — #29's used the dead
`NEXTJS_HANDOFF.md` values because ADR-0029 did not exist yet. Nothing here invents a colour.

The `--sidebar-*` values are the one exception, and they are this ticket's proposal: `globals.css`
parked them as aliases _"until a real navigation surface is designed"_, and this is that surface.
They have since landed in `globals.css` and cleared `pnpm --filter @repo/design-system
check-contrast`.

There is no dark mode. Do not add a media query.

## Deliberately fake

The photographs are CSS gradients with a geometric figure, labelled _foto de prueba_. A prototype
about strangers' faces has no business carrying invented ones, and ADR-0010 rule 4 — never a
technical means of identification — is worth honouring in a mock too.

## Not cleared

No screen-reader pass. The sidebar has no roving tabindex and no skip link. The counts are static.
Nothing here is tested, and under ADR-0017 nothing here _can_ be.
