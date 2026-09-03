import { describe, expect, it } from "vitest";
import { getSystemStats } from "../src/sysStats.js";

describe("getSystemStats", () => {
  it("returns real loadAvg1/freeMemPct within sane bounds, and diskFreePct null by default", async () => {
    const stats = await getSystemStats();

    expect(typeof stats.loadAvg1).toBe("number");
    expect(stats.loadAvg1).toBeGreaterThanOrEqual(0);

    expect(typeof stats.freeMemPct).toBe("number");
    expect(stats.freeMemPct).toBeGreaterThan(0);
    expect(stats.freeMemPct).toBeLessThanOrEqual(100);

    expect(stats.diskFreePct).toBeNull();
  });

  it("flows a provided diskCheck's freePct through to diskFreePct", async () => {
    const stats = await getSystemStats(async () => ({ freePct: 42.5 }));
    expect(stats.diskFreePct).toBe(42.5);
  });

  it("yields diskFreePct: null when the diskCheck resolves null", async () => {
    const stats = await getSystemStats(async () => null);
    expect(stats.diskFreePct).toBeNull();
  });
});
