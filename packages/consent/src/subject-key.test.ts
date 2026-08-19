import { subjectKey, subjectKeyMatches, WeakSubjectKeySecretError } from "./subject-key";

const SECRET = "test-subject-key-secret-not-for-any-real-environment";
const OTHER_SECRET = "a-completely-different-secret-of-sufficient-length!!";

describe("the subject key", () => {
  it("is a 64-character lowercase hex digest", () => {
    expect(subjectKey(SECRET, "yeimy@example.test")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for the same address", () => {
    expect(subjectKey(SECRET, "yeimy@example.test")).toBe(subjectKey(SECRET, "yeimy@example.test"));
  });

  // The normalisation has to stay identical forever: change it and every row written before the
  // change stops being findable by the address that wrote it, silently.
  it("ignores case and surrounding whitespace", () => {
    const canonical = subjectKey(SECRET, "yeimy@example.test");
    expect(subjectKey(SECRET, "YEIMY@Example.Test")).toBe(canonical);
    expect(subjectKey(SECRET, "  yeimy@example.test  ")).toBe(canonical);
  });

  it("distinguishes two addresses", () => {
    expect(subjectKey(SECRET, "yeimy@example.test")).not.toBe(
      subjectKey(SECRET, "hector@example.test"),
    );
  });

  // What the key buys over a bare digest: without it, an email is a small enough space to be a
  // lookup table, and the surviving evidence would be re-identifiable by anyone who obtained it.
  it("is unreproducible without the secret", () => {
    expect(subjectKey(SECRET, "yeimy@example.test")).not.toBe(
      subjectKey(OTHER_SECRET, "yeimy@example.test"),
    );
  });

  it("refuses a secret short enough to be a placeholder", () => {
    expect(() => subjectKey("changeme", "yeimy@example.test")).toThrow(WeakSubjectKeySecretError);
    expect(() => subjectKey("", "yeimy@example.test")).toThrow(WeakSubjectKeySecretError);
  });
});

describe("matching an address against a stored key", () => {
  it("recognises the address that wrote it", () => {
    const key = subjectKey(SECRET, "yeimy@example.test");
    expect(subjectKeyMatches(SECRET, "YEIMY@example.test", key)).toBe(true);
  });

  it("rejects a different address", () => {
    const key = subjectKey(SECRET, "yeimy@example.test");
    expect(subjectKeyMatches(SECRET, "hector@example.test", key)).toBe(false);
  });

  // A truncated or malformed key must be a plain `false`, never a throw out of `timingSafeEqual`
  // for buffers of different lengths.
  it("rejects a malformed key without throwing", () => {
    expect(subjectKeyMatches(SECRET, "yeimy@example.test", "deadbeef")).toBe(false);
    expect(subjectKeyMatches(SECRET, "yeimy@example.test", "")).toBe(false);
  });
});
