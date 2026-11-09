import { describe, expect, it } from "vitest";
import { addDays, clampTime, localDate, weekday, zonedTime } from "./time";

describe("zonedTime", () => {
  it("converts Kolkata wall time to UTC", () => {
    expect(zonedTime("2026-11-12", "09:00", "Asia/Kolkata").toISOString()).toBe("2026-11-12T03:30:00.000Z");
  });

  it("handles DST in New York", () => {
    expect(zonedTime("2026-07-01", "09:00", "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedTime("2026-12-01", "09:00", "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
});

describe("localDate", () => {
  it("uses the shop's timezone, not UTC", () => {
    // 20:00 UTC is already the next day in Kolkata.
    expect(localDate(new Date("2026-11-10T20:00:00Z"), "Asia/Kolkata")).toBe("2026-11-11");
    expect(localDate(new Date("2026-11-10T20:00:00Z"), "UTC")).toBe("2026-11-10");
  });
});

describe("date helpers", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
  });
  it("gets the weekday", () => {
    expect(weekday("2026-11-10")).toBe(2); // Tuesday
  });
  it("clamps times into opening hours", () => {
    expect(clampTime("06:30", "08:00", "20:00")).toBe("08:00");
    expect(clampTime("22:15", "08:00", "20:00")).toBe("20:00");
    expect(clampTime("12:05", "08:00", "20:00")).toBe("12:05");
  });
});
