import { uuidv7 } from "./uuidv7";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("is a well-formed UUID string", () => {
    expect(uuidv7()).toMatch(UUID);
  });

  it("declares version 7", () => {
    expect(uuidv7()[14]).toBe("7");
  });

  it("declares the RFC 9562 variant", () => {
    expect(["8", "9", "a", "b"]).toContain(uuidv7()[19]);
  });

  it("carries the current time in its leading 48 bits", () => {
    const before = Date.now();
    const milliseconds = Number.parseInt(uuidv7().replaceAll("-", "").slice(0, 12), 16);
    expect(milliseconds).toBeGreaterThanOrEqual(before);
    expect(milliseconds).toBeLessThanOrEqual(Date.now());
  });

  /** The property the whole choice is for: a growing prefix keeps the unique index from fragmenting. */
  it("sorts in generation order across milliseconds", async () => {
    const first = uuidv7();
    await new Promise((resolve) => setTimeout(resolve, 2));
    expect(first < uuidv7()).toBe(true);
  });

  it("does not repeat", () => {
    expect(new Set(Array.from({ length: 1_000 }, uuidv7)).size).toBe(1_000);
  });
});
