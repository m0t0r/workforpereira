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

import { NOTIFICATION_MESSAGES, renderNotification } from "./templates";

describe("no notification can carry Contact Details", () => {
  it("renders from the template name and nothing else", () => {
    // A second parameter is how interpolation would arrive. Its absence is the invariant.
    expect(renderNotification.length).toBe(1);
  });

  it("covers every template in the schema's vocabulary, and invents none", () => {
    expect(Object.keys(NOTIFICATION_MESSAGES).sort()).toEqual([...NOTIFICATION_TEMPLATES].sort());
  });

  it.each(NOTIFICATION_TEMPLATES)("renders %s identically every time", (template) => {
    // Nothing to interpolate means nothing that can differ between two calls — the runtime shadow
    // of "takes no parameters".
    expect(renderNotification(template)).toEqual(renderNotification(template));
  });

  describe.each(NOTIFICATION_TEMPLATES)("%s", (template) => {
    const { subject, body } = NOTIFICATION_MESSAGES[template];
    const text = `${subject}\n${body}`;

    it("carries no email address", () => {
      expect(text).not.toMatch(/@/);
    });

    it("carries no phone number", () => {
      // Colombian mobile numbers are ten digits, landlines seven, and `+57` prefixes both.
      expect(text).not.toMatch(/\+?\d[\d\s-]{5,}/);
    });

    it("carries no interpolation left open for one", () => {
      expect(text).not.toMatch(/\$\{|\{\{|%s|<[a-z_]+>/i);
    });

    it("says something, in Spanish, to a person", () => {
      expect(subject.length).toBeGreaterThan(0);
      expect(body).toMatch(/Encuentra/);
    });
  });
});
