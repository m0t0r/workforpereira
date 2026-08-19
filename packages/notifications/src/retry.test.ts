import { isPoison, MAX_ATTEMPTS, nextAttemptAfter, retryDelayMs } from "./retry";

/** No database handle, so ADR-0017 makes this a unit test. */
describe("whether a row is poison", () => {
  it("is not, below the bound", () => {
    expect(isPoison(0)).toBe(false);
    expect(isPoison(MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("is, at the bound", () => {
    expect(isPoison(MAX_ATTEMPTS)).toBe(true);
  });

  it("stays poison above it, so a row that somehow overshot is never reclaimed", () => {
    expect(isPoison(MAX_ATTEMPTS + 1)).toBe(true);
  });
});

describe("the backoff", () => {
  it("waits at least as long as the sweep interval on the first failure", () => {
    // Anything shorter is rounded up by the five-minute sweep anyway (ADR-0028).
    expect(retryDelayMs(1)).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });

  it("grows with each attempt", () => {
    const delays = Array.from({ length: MAX_ATTEMPTS }, (_, i) => retryDelayMs(i + 1));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it("does not go backwards on a zeroth attempt", () => {
    expect(retryDelayMs(0)).toBe(retryDelayMs(1));
  });

  it("moves the next attempt forward from the given instant", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    expect(nextAttemptAfter(now, 1).getTime()).toBe(now.getTime() + retryDelayMs(1));
  });
});
