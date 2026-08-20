import { PURPOSES } from "@repo/db/schema";

import {
  PURPOSE_METADATA,
  purposesForSurface,
  REQUIRED_SIGNUP_PURPOSES,
  SIGNUP_PURPOSES,
} from "./purposes";

/**
 * ADR-0017: takes no handle, so it is a unit test. The ticket names this one explicitly — *"the
 * purpose metadata that ADR-0007 makes code rather than rows"*.
 */

describe("the Purpose vocabulary", () => {
  it("has six members, and names the two that left", () => {
    // Both departures are the same argument. ADR-0016 dropped `suggestions`: nothing sends a
    // Suggestion, so consenting to it would make the Disclosure describe a _finalidad_ nobody
    // pursues. #70 dropped `news` on the same ground — nothing sends news mail, there is no template
    // for it, and asking for Ley 2300 commercial-message consent the platform never exercises buys
    // liability with a box on the one form every Person has to fill in.
    expect(PURPOSES).toHaveLength(6);
    expect(PURPOSES).not.toContain("suggestions");
    expect(PURPOSES).not.toContain("news");
  });

  it("describes every Purpose", () => {
    for (const purpose of PURPOSES) {
      expect(PURPOSE_METADATA[purpose]).toBeDefined();
    }
  });
});

describe("the signup form", () => {
  // The acceptance criterion, as an assertion: exactly these boxes render, and no others.
  it("asks three Purposes", () => {
    expect(SIGNUP_PURPOSES).toEqual(["account", "transactional_messages", "safety"]);
  });

  it("makes all three refuse to proceed unless ticked", () => {
    expect(REQUIRED_SIGNUP_PURPOSES).toEqual(["account", "transactional_messages", "safety"]);
  });

  // `news` left the vocabulary with #70 on ADR-0016's argument — nothing sends news mail, and
  // consenting to a *finalidad* nobody pursues makes the Disclosure describe a fiction. Its
  // departure makes the two constants above coincide, and this is what stops that coincidence from
  // being mistaken for a redundancy: `REQUIRED_SIGNUP_PURPOSES` is derived from each Purpose's own
  // metadata, never from the fact that it appears on the signup surface. Collapsing the two would
  // make the next optional Purpose added here a silent condition of signing up.
  // **This cannot discriminate today, and saying so is the point.** With every signup Purpose
  // required, a `REQUIRED_SIGNUP_PURPOSES` defined as plain `SIGNUP_PURPOSES` would pass it. It
  // starts discriminating the moment an optional Purpose is added to this surface — which is exactly
  // when getting it wrong would make that Purpose a silent condition of signing up.
  it("carries the requirement from each Purpose's own metadata", () => {
    for (const purpose of SIGNUP_PURPOSES) {
      expect(REQUIRED_SIGNUP_PURPOSES.includes(purpose)).toBe(
        PURPOSE_METADATA[purpose].requirement === "required",
      );
    }
  });

  // Ley 2300 art. 5 par. 2 forbids requiring consent to commercial messages, so no commercial
  // *finalidad* may ever be listed as required. With `news` gone there is nothing to test the rule
  // against — this asserts the state that makes that true, so re-adding one without reading the
  // statute fails here rather than shipping.
  it("asks for no commercial-message purpose at all", () => {
    expect(SIGNUP_PURPOSES).not.toContain("news");
  });

  it("does not ask for anything consented in context", () => {
    for (const purpose of ["publish", "disclose_contact", "photo"] as const) {
      expect(SIGNUP_PURPOSES).not.toContain(purpose);
    }
  });
});

describe("the third requirement state", () => {
  // ADR-0010: D.1377 art. 6 bans conditioning an activity on sensitive data, and a boolean
  // required/optional cannot express "may never be required by anything".
  it("has exactly one member, and it is photo", () => {
    const neverRequirable = PURPOSES.filter(
      (purpose) => PURPOSE_METADATA[purpose].requirement === "never-requirable",
    );
    expect(neverRequirable).toEqual(["photo"]);
  });

  it("keeps every required Purpose clear of sensitive data", () => {
    // The narrow ground ADR-0010 left ADR-0007 standing on: `account`,
    // `transactional_messages` and `safety` may be required *because* each conditions on ordinary
    // data only. `photo` is the one purpose touching sensitive data, and it is never required.
    const required = PURPOSES.filter((p) => PURPOSE_METADATA[p].requirement === "required");
    expect(required).not.toContain("photo");
  });
});

describe("the minimum disclosure version", () => {
  it("is set for every Purpose asked at signup", () => {
    for (const purpose of SIGNUP_PURPOSES) {
      expect(PURPOSE_METADATA[purpose].minimumDisclosureVersion).toBe("2026-08-19");
    }
  });

  it("is null for disclose_contact, which is granted fresh per Offer", () => {
    // ADR-0007 exempts it explicitly: there is never a stale grant to invalidate.
    expect(PURPOSE_METADATA.disclose_contact.minimumDisclosureVersion).toBeNull();
  });
});

describe("consent surfaces", () => {
  it("puts each Purpose on exactly one surface", () => {
    const surfaced = [
      ...purposesForSurface("signup"),
      ...purposesForSurface("publish"),
      ...purposesForSurface("offer-send"),
      ...purposesForSurface("offer-accept"),
      ...purposesForSurface("photo"),
    ];
    expect(new Set(surfaced).size).toBe(surfaced.length);
    expect([...surfaced].sort()).toEqual([...PURPOSES].sort());
  });
});
