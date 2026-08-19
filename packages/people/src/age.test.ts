import { bogotaCalendarDate, InvalidDateOfBirthError, isAdult } from "./age";

/** 2026-08-19, 15:00 in Pereira — comfortably inside one calendar day on both clocks. */
const MIDDAY = new Date("2026-08-19T20:00:00Z");

describe("the calendar date in Pereira", () => {
  it("is the same day as UTC in the middle of the afternoon", () => {
    expect(bogotaCalendarDate(MIDDAY)).toBe("2026-08-19");
  });

  it("is still yesterday when UTC has already rolled over", () => {
    // 22:00 on the 19th in Pereira is 03:00 on the 20th in UTC. This one day is the whole reason
    // the offset is applied at all.
    expect(bogotaCalendarDate(new Date("2026-08-20T03:00:00Z"))).toBe("2026-08-19");
  });

  it("rolls over at five in the morning UTC", () => {
    expect(bogotaCalendarDate(new Date("2026-08-20T04:59:59Z"))).toBe("2026-08-19");
    expect(bogotaCalendarDate(new Date("2026-08-20T05:00:00Z"))).toBe("2026-08-20");
  });
});

describe("the 18+ gate", () => {
  it("admits someone on their eighteenth birthday", () => {
    expect(isAdult("2008-08-19", MIDDAY)).toBe(true);
  });

  it("refuses someone the day before their eighteenth birthday", () => {
    expect(isAdult("2008-08-20", MIDDAY)).toBe(false);
  });

  it("refuses someone comfortably under age", () => {
    expect(isAdult("2012-01-01", MIDDAY)).toBe(false);
  });

  it("admits someone comfortably over age", () => {
    expect(isAdult("1974-06-30", MIDDAY)).toBe(true);
  });

  // The boundary the offset exists for: at 22:00 on the 19th in Pereira it is already the 20th in
  // UTC, so a gate reading the server clock would admit tomorrow's eighteen-year-old tonight.
  it("does not admit tomorrow's eighteen-year-old late in the Pereira evening", () => {
    const lateInPereira = new Date("2026-08-20T03:00:00Z");
    expect(isAdult("2008-08-20", lateInPereira)).toBe(false);
  });

  it("admits them once Pereira has reached the day", () => {
    const nextMorningInPereira = new Date("2026-08-20T13:00:00Z");
    expect(isAdult("2008-08-20", nextMorningInPereira)).toBe(true);
  });

  // Documented in `age.ts`: 29 February has no birthday in a non-leap year, and the string
  // comparison lands on 1 March rather than 28 February. Conservative by construction.
  it("makes a leap-day birth an adult on the first of March", () => {
    expect(isAdult("2008-02-29", new Date("2026-02-28T18:00:00Z"))).toBe(false);
    expect(isAdult("2008-02-29", new Date("2026-03-01T18:00:00Z"))).toBe(true);
  });

  it("refuses a value that is not a calendar date", () => {
    expect(() => isAdult("19/08/2008", MIDDAY)).toThrow(InvalidDateOfBirthError);
    expect(() => isAdult("2008-08-19T00:00:00Z", MIDDAY)).toThrow(InvalidDateOfBirthError);
    expect(() => isAdult("", MIDDAY)).toThrow(InvalidDateOfBirthError);
  });

  it("refuses a date that has the right shape and does not exist", () => {
    expect(() => isAdult("2008-13-01", MIDDAY)).toThrow(InvalidDateOfBirthError);
    expect(() => isAdult("2007-02-30", MIDDAY)).toThrow(InvalidDateOfBirthError);
  });
});
