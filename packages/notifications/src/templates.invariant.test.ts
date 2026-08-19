/**
 * **Invariant Test — ADR-0015, as amended by #70.** No Contact Details in any notification, ever.
 *
 * The rule is easy to state and impossible to hold as a review convention: every call site that
 * composes a message is a chance to interpolate a phone number, and email is a channel we do not
 * control — forwardable, retained indefinitely, and outside every Consent record and
 * contact-exchange log ADR-0007 exists to produce.
 *
 * So the rule is structural. It **was** *a template takes no parameters and the row carries no
 * body*, and #70 could not write a verification link under that — the whole message is the link. The
 * amendment is the narrowest thing that works, and these assertions are what keep it narrow:
 *
 * - **Exactly two templates may take anything**, and what they take is a single-use token: opaque,
 *   identifying a `verifications` row rather than a person, and not a Contact Detail.
 * - **The other five still take nothing**, enforced by a discriminated union in `templates.tsx`
 *   (a compile error) and by `notification_outbox_token_check` (a constraint violation).
 * - **The component composes the URL.** No caller is ever handed the shape of a link.
 *
 * Never weakened without amending ADR-0015 again.
 */

import { NOTIFICATION_TEMPLATES, TOKEN_BEARING_TEMPLATES } from "@repo/db/schema";

import {
  isTokenBearing,
  NOTIFICATION_TEMPLATE_NAMES,
  renderNotification,
  type NotificationMessage,
} from "./templates";

const APP_URL = "https://encuentra.example";
/** No `@`, and no run of digits that could be mistaken for a telephone number. */
const TOKEN = "aaaabbbbccccddddeeeeffff";

/** Whatever this template needs, and nothing more. */
function message(template: (typeof NOTIFICATION_TEMPLATES)[number]): NotificationMessage {
  return isTokenBearing(template)
    ? { template, token: TOKEN, appUrl: APP_URL }
    : { template: template as never };
}

describe("the parameter slot is exactly two templates wide", () => {
  it("names the two, and no others", () => {
    // Widening this list is a schema change with a migration and a review — which is the property
    // the original no-parameters rule had, and the thing an amendment most easily loses.
    expect([...TOKEN_BEARING_TEMPLATES]).toEqual(["email_verification", "password_reset"]);
  });

  it("leaves the five Offer templates taking nothing", () => {
    const parameterless = NOTIFICATION_TEMPLATES.filter((t) => !isTokenBearing(t));
    expect([...parameterless].sort()).toEqual(
      [
        "offer_accepted",
        "offer_declined",
        "offer_expired",
        "offer_received",
        "offer_withdrawn",
      ].sort(),
    );
  });

  it("covers every template in the schema's vocabulary, and invents none", () => {
    expect([...NOTIFICATION_TEMPLATE_NAMES].sort()).toEqual([...NOTIFICATION_TEMPLATES].sort());
  });

  it("takes one argument, so there is no second slot beside the message", () => {
    // The union *is* the slot. A second parameter is how a body would arrive, and its absence is
    // what stops one.
    expect(renderNotification.length).toBe(1);
  });
});

describe.each(NOTIFICATION_TEMPLATES)("%s", (template) => {
  it("carries no email address, in either part", async () => {
    const { subject, html, text } = await renderNotification(message(template));
    expect(`${subject}\n${html}\n${text}`).not.toMatch(/@/);
  });

  it("carries no phone number, in either part", async () => {
    const { subject, html, text } = await renderNotification(message(template));
    // Tags stripped so a `<td>` or a hex colour is not a false match, and URLs stripped so a token
    // is not — a link is not prose, and the assertion below is what bounds where a link may point.
    // Colombian mobile numbers are ten digits, landlines seven, and `+57` prefixes both.
    const prose = `${subject}\n${html.replace(/<[^>]*>/g, " ")}\n${text}`.replace(
      /https?:\/\/\S+/g,
      " ",
    );
    expect(prose).not.toMatch(/\+?\d[\d\s-]{5,}/);
  });

  it("leaves no interpolation open", async () => {
    const { subject, html, text } = await renderNotification(message(template));
    expect(`${subject}\n${html}\n${text}`).not.toMatch(/\$\{|\{\{|%s/);
  });

  // New with the amendment, and the assertion that makes stripping URLs above safe: a notification
  // may link to this application and to nowhere else. Without it, "no Contact Details" would have a
  // hole shaped exactly like a link.
  //
  // `href` attributes rather than every `https?://` in the file, because the doctype React Email
  // emits carries the XHTML DTD's own URL — that is markup, not somewhere a reader can be sent.
  // The plain-text part is scanned whole, since it has no markup to confuse.
  it("links nowhere but this application", async () => {
    const { html, text } = await renderNotification(message(template));

    const linked = [
      ...[...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1] ?? ""),
      ...(text.match(/https?:\/\/[^\s"'<>)]+/g) ?? []),
    ];

    for (const url of linked) {
      expect(url.startsWith(`${APP_URL}/`)).toBe(true);
    }
  });

  it("says something, in Spanish, to a person", async () => {
    const { subject, html, text } = await renderNotification(message(template));
    expect(subject.length).toBeGreaterThan(0);
    expect(text).toMatch(/Encuentra/);
    // Both parts are produced from one component, so they cannot drift into saying different
    // things — which for a legal-adjacent notification is the real risk, not the styling.
    expect(html).toMatch(/Encuentra/);
    expect(html).toMatch(/<html/i);
  });

  it("declares Spanish, so a screen reader reads it in the right language", async () => {
    const { html } = await renderNotification(message(template));
    expect(html).toMatch(/lang="es"/);
  });
});

describe("a parameterless template", () => {
  const parameterless = NOTIFICATION_TEMPLATES.filter((t) => !isTokenBearing(t));

  it.each(parameterless)("renders %s identically every time", async (template) => {
    // Nothing to interpolate means nothing that can differ between two calls — the runtime shadow
    // of "takes no parameters", and the reason these five are the only ones cached.
    expect(await renderNotification(message(template))).toEqual(
      await renderNotification(message(template)),
    );
  });
});

describe("a token-bearing template", () => {
  const tokenBearing = NOTIFICATION_TEMPLATES.filter(isTokenBearing);

  it.each(tokenBearing)("puts the token in %s's link and nowhere else", async (template) => {
    const { subject, html, text } = await renderNotification({
      template,
      token: TOKEN,
      appUrl: APP_URL,
    });

    expect(subject).not.toContain(TOKEN);
    // Present, because the message *is* the link.
    expect(html).toContain(TOKEN);
    // And only ever inside a URL — never quoted at the reader as a code to type, which would make
    // it copyable out of the message into somewhere it can be phished.
    for (const occurrence of text.split(TOKEN).slice(0, -1)) {
      expect(occurrence).toMatch(/https?:\/\/\S*$/);
    }
  });

  // The cache is keyed to the parameterless union in `templates.tsx`, so this cannot regress
  // silently — but the failure it prevents is bad enough to assert directly: one person's
  // verification link delivered to the next person who signed up.
  it.each(tokenBearing)("never serves %s from a cache", async (template) => {
    const first = await renderNotification({ template, token: "token-one", appUrl: APP_URL });
    const second = await renderNotification({ template, token: "token-two", appUrl: APP_URL });

    expect(first.html).toContain("token-one");
    expect(second.html).toContain("token-two");
    expect(second.html).not.toContain("token-one");
  });
});
