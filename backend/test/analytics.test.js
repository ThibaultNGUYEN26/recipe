import { describe, expect, it } from "vitest";
import { percentChange, startOfUtcDay } from "../routes/users.js";

describe("creator analytics calculations", () => {
  it("compares current activity with the preceding period", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
  });

  it("handles an empty previous period without dividing by zero", () => {
    expect(percentChange(3, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("normalizes chart boundaries to a UTC day", () => {
    expect(startOfUtcDay(new Date("2026-08-04T19:42:10.000Z")).toISOString()).toBe("2026-08-04T00:00:00.000Z");
  });
});
