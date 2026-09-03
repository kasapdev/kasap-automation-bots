import { describe, expect, it } from "vitest";
import { computeEarnedPoints } from "../src/activityTracker.js";

describe("computeEarnedPoints", () => {
  it("earns points on the first message ever (no prior timestamp)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeEarnedPoints(now, null, 5, 60_000)).toBe(5);
  });

  it("earns 0 points for a message sent within the cooldown", () => {
    const lastEarnedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date("2026-01-01T00:00:30.000Z"); // 30s later, cooldown is 60s
    expect(computeEarnedPoints(now, lastEarnedAt, 5, 60_000)).toBe(0);
  });

  it("earns points again once the cooldown has fully elapsed", () => {
    const lastEarnedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date("2026-01-01T00:01:01.000Z"); // 61s later
    expect(computeEarnedPoints(now, lastEarnedAt, 5, 60_000)).toBe(5);
  });

  it("treats exactly-at-cooldown as earning (inclusive boundary)", () => {
    const lastEarnedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date("2026-01-01T00:01:00.000Z"); // exactly 60s later
    expect(computeEarnedPoints(now, lastEarnedAt, 5, 60_000)).toBe(5);
  });
});
