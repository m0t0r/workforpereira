# Prototype — the signup flow through the credential fork (#70, #71)

**Throwaway.** One self-contained HTML file. Double-click `index.html`, or:

```sh
open docs/design/signup-consent-prototype/index.html
```

No build, no server, no dependencies. Nothing here is production code.

> Three variants of the whole signup flow, switchable via `?variant=`, plus three cross-cutting
> toggles (`?detail=`, `?refusal=`, `?width=`). Which branch of the credential fork you take is not a
> toggle — you tap it, because the tap is the decision under review.

## Two rounds, and why there were two

**Round 1** asked "how do the four consent boxes read on a phone" and got the scope wrong twice.

First, `news`. The repo owner's read on seeing four boxes was that we should not be asking about it at
all, and that is now decided and shipped — `feat(consent): nothing sends news mail, so nothing asks
to` removes it from the Purpose vocabulary on ADR-0016's argument. See the amendment banner on
ADR-0007. **`/signup` asks three boxes and every one of them is required.**

Second, and worse: round 1 ended on a password field. ADR-0009 line 105 says `/signup` asks for name,
date of birth and the consent boxes and **_then_ offers Google, Facebook or a password**. The
credential step is a **three-way fork**, and the box structure cannot be judged without it — C's whole
cost is measured in screens, and the fork adds one or two more. Round 1 reported "five taps" for C.
With the fork it is five screens to Google and six to a password.

**Round 2** is the whole flow, with box structure as one variable inside it rather than the subject.
#71 is modelled as **screens and state transitions only** — tapping Google never leaves the page.

## Verdict

**C — one decision per screen, provisionally.** Chosen to build `/signup` against, with the explicit
expectation that it is reviewed again once there is a real screen to look at. It is the most expensive
of the three in screens and the most generous in reading room, and that trade is the thing to re-open.

| Question                           | Answer                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| Whether to ask about `news` at all | **No.** Removed from the vocabulary — see above.               |
| Flow shape                         | **C — one decision per screen.** Provisional; review again.    |
| Where the refusal is expressed     | **`live`** — a running note, never a disabled button.          |
| How much art. 12 copy is inline    | **`progressive`** — one line plus "Ver el detalle".            |
| Where the consent gate sits        | **On the fork**, every branch — consent precedes the redirect. |
| Success screens                    | **Two.** Password → check your mail. OAuth → already verified. |

### What choosing C commits us to

- **Six screens on the password branch**, which is the branch #70 builds. Identity → three
  _finalidades_ → fork → password.
- **State held across steps and written at the end.** Nothing is persisted until submit on the password
  branch, and until the Pending Signup on the OAuth branch. A stepped flow makes "where does the
  half-filled form live" a real question that a single page does not have.
- **Refusing a box does not trap you.** It advances, and the wall is the fork. Trapping someone on
  screen three with no way forward and no sight of what they would be giving up is worse than letting
  them reach the fork and be told there.

## The three variants

Flip with the arrows in the black bar, the `←`/`→` keys, or `?variant=A|B|C`.

| Key   | Name                    | Structure                                                                     | Screens, and what it bets on                                                                                                           |
| ----- | ----------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | One page                | identity + boxes + fork on one scroll; password fields revealed in place      | 1 screen either way. That the shortest path to the fork is what matters, and someone who came for Google should meet it without paging |
| **B** | Two pages               | page 1 = identity + grouped boxes + consequence once; page 2 = the fork alone | 2 screens to Google, 3 to a password. That consent and credential are different kinds of decision and should not share a scroll        |
| **C** | One decision per screen | identity → three _finalidades_ → fork → password                              | 5 screens to Google, 6 to a password. That legally load-bearing copy is not read in a list                                             |

They disagree about more than layout:

- **Where the consequence lives.** A repeats it per box, B states it once after the block, C states
  it at the moment of refusal — on the "No autorizo" button itself.
- **Whether refusing stops you.** In C, refusing a required purpose **does not block the step**. The
  wall is at the end. Trapping someone on screen three with no way forward and no sight of what they
  are giving up is worse than letting them reach the end and be told.
- **How many screens the decision costs.** One scroll versus five taps, on a phone, for an audience
  the product assumes has low digital literacy.

## The three toggles

| Param     | Values                   | The decision it isolates                                                                                                                                                                                                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `refusal` | `submit` · `live`        | Whether the refusal appears only after pressing the button, or a running note says what is still missing. **The button is never disabled** in either — a disabled button explains nothing, and "why can't I press this" is the failure mode this whole screen exists to avoid. |
| `detail`  | `inline` · `progressive` | Whether the full art. 12 sentence is always visible, or folded behind "Ver el detalle" with a one-line summary. `progressive` is the riskier one: art. 12 wants the information given **before** the box is ticked, which is why it is a toggle to argue with, not a default.  |
| `width`   | `390` · `768`            | The phone case is the one that matters; `768` is there to check that the answer does not only work small.                                                                                                                                                                      |

## The payload readout

Under the form, in mono, is **the exact `decisions` array a Server Action would receive**, with
granted/refused colour-coded and a running count.

It is there because of the gap `CLAUDE.md` and ADR-0017 name: ADR-0017 allows tests at two seams and
neither is a React component or a Server Action adapter, so **a form that silently posted
`isGranted: true` for every box would pass every test in this repository.** The prototype cannot close
that gap, but it can refuse to hide the one thing the gap is about.

Note what it always shows: **one entry per Purpose, never one per ticked box.** `recordSignupConsents`
rejects a set with a purpose missing, and since `news` left, that boundary check is the _whole_ of what
shows the boxes were rendered and separately selectable — a refusal now throws before the insert
rather than being stored, so there is no refused row left to point at.

## What is fixed in every variant, and is not up for design

- **Three boxes, all unticked on load.** No pre-ticking, no bundling, and **no "aceptar todo"** — the
  SIC's _Formatos modelo_ (2022) requires each _finalidad_ to be separately selectable.
- **A decision is sent for every box**, and a missing one is refused rather than inferred.
- **After signup nobody is signed in.** `autoSignIn: false` is what buys ADR-0009's enumeration
  hardening, so every variant ends on the same panel: check your mail, then sign in with the password
  you just chose.
- **Order: name → date of birth → the three boxes → the credential.** The credential comes last
  because ADR-0009 makes it the thing you pick _after_ authorising, and social sign-in (#71) slots in
  at that position.
- **Date of birth is captured and never displayed.** It is checked once by the 18+ gate and is not on
  the `Person` type at all.

## Language

**The prototype's controls are English. Only the copy inside the form is Spanish.**

The black bar, its labels and values (`Refusal · submit | live`, `Detail · inline | progressive`,
`Width · 390 | 768`, `Reset`), the banner, the payload readout and the search-param values are
instrumentation — they are deleted when this prototype is captured, so no string in them will ever
reach a user. This is ADR-0001: a prototype's own chrome is chrome, not UI copy.

The Spanish comes from `docs/legal/disclosure-signup/2026-08-19.md`, near-verbatim and in the `tú`
register, because the frozen disclosure is the thing the boxes have to agree with.

## One implementation note that is not about design

`history.replaceState` **throws a `SecurityError` on a `file://` origin.** An unguarded call in the
switcher kills it silently — every arrow press dies before `render()` runs. It is wrapped in a
`try`/`catch` here and the URL is treated as a nice-to-have; the render is not. Three older
prototypes in `docs/design/` still have the unguarded version.
