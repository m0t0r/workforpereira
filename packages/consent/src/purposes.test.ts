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
  it("has seven members, not eight", () => {
    // ADR-0016 dropped `suggestions` from the v1 set: nothing sends a Suggestion, so consenting to
    // it would make the Disclosure describe a _finalidad_ nobody pursues.
    expect(PURPOSES).toHaveLength(7);
    expect(PURPOSES).not.toContain("suggestions");
  });

  it("describes every Purpose", () => {
    for (const purpose of PURPOSES) {
      expect(PURPOSE_METADATA[purpose]).toBeDefined();
    }
  });
});

describe("the signup form", () => {
  // The acceptance criterion, as an assertion: "exactly four boxes render".
  it("asks four Purposes", () => {
    expect(SIGNUP_PURPOSES).toEqual(["account", "transactional_messages", "safety", "news"]);
  });

  it("makes three of them refuse to proceed unless ticked", () => {
    expect(REQUIRED_SIGNUP_PURPOSES).toEqual(["account", "transactional_messages", "safety"]);
  });

  it("leaves news optional", () => {
    // Ley 2300 art. 5 par. 2 forbids requiring consent to commercial messages. This is not a
    // preference that can be revisited without a statute changing.
    expect(PURPOSE_METADATA.news.requirement).toBe("optional");
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
