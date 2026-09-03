import { describe, it, expect } from "vitest";
import { isExpiringSoon } from "../src/expiryCheck.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("isExpiringSoon", () => {
  it("does not warn when well within the threshold", () => {
    const expiry = new Date("2026-06-01T00:00:00Z"); // ~151 days out
    const result = isExpiringSoon(expiry, 30, NOW);
    expect(result.warn).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(30);
  });

  it("warns right at the threshold boundary", () => {
    const expiry = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = isExpiringSoon(expiry, 30, NOW);
    expect(result.daysRemaining).toBe(30);
    expect(result.warn).toBe(true);
  });

  it("does not warn just past the threshold (safe side)", () => {
    const expiry = new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1000);
    const result = isExpiringSoon(expiry, 30, NOW);
    expect(result.daysRemaining).toBe(31);
    expect(result.warn).toBe(false);
  });

  it("warns when the domain is already expired (negative days remaining)", () => {
    const expiry = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const result = isExpiringSoon(expiry, 30, NOW);
    expect(result.daysRemaining).toBe(-5);
    expect(result.warn).toBe(true);
  });

  it("warns when expiry is exactly now (zero days remaining)", () => {
    const result = isExpiringSoon(new Date(NOW), 30, NOW);
    expect(result.daysRemaining).toBe(0);
    expect(result.warn).toBe(true);
  });
});
