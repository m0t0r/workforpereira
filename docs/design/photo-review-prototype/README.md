# Prototype — the operator surface, and how a Photo is judged (#28)

Throwaway. Open `index.html` in a browser; there is nothing to install and nothing to run.

## The question, and the answer that was neither option

Only one question, because the grilling session settled everything else before this file existed:
**one internal surface, a sidebar with four links, each carrying a count.** What was open is how an
operator judges a photograph — one at a time, or from a contact sheet of many.

**Seeing both produced a third answer**, which is why this was built rather than argued. The sheet
ships as the **queue** and decides nothing; _Abrir_ lands on the detail page, where every approval
and refusal happens one face at a time.

| `?view=` |                                                                         |
| -------- | ----------------------------------------------------------------------- |
| `sheet`  | The queue. No control on it changes anything. **Default.**              |
| `single` | The detail page _Abrir_ opens — the only place a Photo's state changes. |

That keeps ADR-0010's rule (_a person's standing never changes without a human having looked_) while
answering the objection one-at-a-time could not: an operator working a queue they cannot see has no
idea whether five photographs are waiting or fifty, and ADR-0010's commitment is about **age**.

**Two costs it does not dodge**, both stated on the queue itself: a dozen faces on one screen is the
exposure ADR-0010 accepted, deepened; and twelve thumbnails are twelve signed URLs, so the access
log's grain becomes _one row per face seen_ rather than ADR-0010's _"one row per review"_.

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
