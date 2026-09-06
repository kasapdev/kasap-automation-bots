import { describe, it, expect } from "vitest";
import { diffPrice } from "../src/priceDiff.js";

describe("diffPrice", () => {
  it("reports no drop and a null percentage when there is no previous price", () => {
    const result = diffPrice(undefined, 100);
    expect(result).toEqual({ dropped: false, deltaAbs: 0, deltaPct: null });
  });

  it("reports no drop when the price is unchanged", () => {
    const result = diffPrice(100, 100);
    expect(result).toEqual({ dropped: false, deltaAbs: 0, deltaPct: 0 });
  });

  it("detects a price drop", () => {
    const result = diffPrice(100, 80);
    expect(result.dropped).toBe(true);
    expect(result.deltaAbs).toBe(20);
    expect(result.deltaPct).toBe(20);
  });

  it("does not flag a price rise as a drop", () => {
    const result = diffPrice(80, 100);
    expect(result.dropped).toBe(false);
    expect(result.deltaAbs).toBe(20);
    expect(result.deltaPct).toBe(25);
  });

  it("returns a null percentage instead of NaN/Infinity when the previous price was zero", () => {
    const result = diffPrice(0, 5);
    expect(result.dropped).toBe(false);
    expect(result.deltaAbs).toBe(5);
    expect(result.deltaPct).toBeNull();
  });

  it("handles previous and current both zero without NaN or a false drop", () => {
    const result = diffPrice(0, 0);
    expect(result).toEqual({ dropped: false, deltaAbs: 0, deltaPct: null });
  });
});
