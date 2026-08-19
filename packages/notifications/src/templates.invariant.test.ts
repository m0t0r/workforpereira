/**
 * **Invariant Test — ADR-0015.** No Contact Details in any notification, ever.
 *
 * The rule is easy to state and impossible to hold as a review convention: every call site that
 * composes a message is a chance to interpolate a phone number, and email is a channel we do not
 * control — forwardable, retained indefinitely, and outside every Consent record and
 * contact-exchange log ADR-0007 exists to produce.
 *
 * So the rule is structural instead. **A template takes no parameters and the row carries no
 * body**, which means there is no slot for a Contact Detail to occupy and nothing for a caller to
 * pass. These assertions guard the absence — the thing a future edit would quietly remove.
 *
 * Never weakened without amending ADR-0015.
 */

import { NOTIFICATION_TEMPLATES } from "@repo/db/schema";

import { NOTIFICATION_TEMPLATE_NAMES, renderNotification } from "./templates";

describe("no notification can carry Contact Details", () => {
  it("renders from the template name and nothing else", () => {
    // A second parameter is how interpolation would arrive. Its absence is the invariant, and it
    // survived the move to React Email: the components in `src/emails/` take no props either.
    expect(renderNotification.length).toBe(1);
  });

  it("covers every template in the schema's vocabulary, and invents none", () => {
    expect([...NOTIFICATION_TEMPLATE_NAMES].sort()).toEqual([...NOTIFICATION_TEMPLATES].sort());
  });

  it.each(NOTIFICATION_TEMPLATES)("renders %s identically every time", async (template) => {
    // Nothing to interpolate means nothing that can differ between two calls — the runtime shadow
    // of "takes no parameters".
    expect(await renderNotification(template)).toEqual(await renderNotification(template));
  });

  describe.each(NOTIFICATION_TEMPLATES)("%s", (template) => {
    it("carries no email address, in either part", async () => {
      const { subject, html, text } = await renderNotification(template);
      expect(`${subject}\n${html}\n${text}`).not.toMatch(/@/);
    });

    it("carries no phone number, in either part", async () => {
      const { subject, html, text } = await renderNotification(template);
      // Colombian mobile numbers are ten digits, landlines seven, and `+57` prefixes both. The HTML
      // part is checked with the tags stripped, so a `<td>` or a hex colour is not a false match.
      const prose = `${subject}\n${html.replace(/<[^>]*>/g, " ")}\n${text}`;
      expect(prose).not.toMatch(/\+?\d[\d\s-]{5,}/);
    });

    it("leaves no interpolation open for one", async () => {
      const { subject, html, text } = await renderNotification(template);
      expect(`${subject}\n${html}\n${text}`).not.toMatch(/\$\{|\{\{|%s/);
    });

    it("says something, in Spanish, to a person", async () => {
      const { subject, html, text } = await renderNotification(template);
      expect(subject.length).toBeGreaterThan(0);
      expect(text).toMatch(/Encuentra/);
      // Both parts are produced from one component, so they cannot drift into saying different
      // things — which for a legal-adjacent notification is the real risk, not the styling.
      expect(html).toMatch(/Encuentra/);
      expect(html).toMatch(/<html/i);
    });

    it("declares Spanish, so a screen reader reads it in the right language", async () => {
      const { html } = await renderNotification(template);
      expect(html).toMatch(/lang="es"/);
    });
  });
});
