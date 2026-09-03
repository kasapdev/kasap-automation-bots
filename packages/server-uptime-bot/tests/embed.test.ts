import { describe, expect, it } from "vitest";
import { formatStatusEmbed, type TargetCheckResult } from "../src/embed.js";

const CHECKED_AT = "2026-09-04T12:00:00.000Z";

describe("formatStatusEmbed", () => {
  it("formats an all-up report with Turkish labels and green color", () => {
    const results: TargetCheckResult[] = [
      { name: "Web", ok: true, latencyMs: 12 },
      { name: "Minecraft", ok: true, latencyMs: 34 },
    ];
    const embed = formatStatusEmbed(
      results,
      { loadAvg1: 0.5, freeMemPct: 60, diskFreePct: 55.2 },
      CHECKED_AT,
    );

    expect(embed.title).toBe("Sunucu Durum Raporu");
    expect(embed.color).toBe(0x2ecc71);
    expect(embed.timestamp).toBe(CHECKED_AT);
    expect(embed.footer.text).toBe("2/2 hedef çevrimiçi");

    const webField = embed.fields.find((f) => f.name === "Web");
    expect(webField?.value).toContain("🟢 Çevrimiçi");
    expect(webField?.value).toContain("12 ms");

    const systemField = embed.fields.find((f) => f.name === "Sistem Durumu");
    expect(systemField?.value).toContain("Sistem yükü (1dk): 0.50");
    expect(systemField?.value).toContain("Boş RAM: 60.0%");
    expect(systemField?.value).toContain("Boş disk: 55.2%");
  });

  it("formats an all-down report with Turkish error labels and red color", () => {
    const results: TargetCheckResult[] = [
      { name: "Web", ok: false, error: "timeout" },
      { name: "Minecraft", ok: false, error: "ECONNREFUSED" },
    ];
    const embed = formatStatusEmbed(
      results,
      { loadAvg1: 1.2, freeMemPct: 20, diskFreePct: null },
      CHECKED_AT,
    );

    expect(embed.color).toBe(0xe74c3c);
    expect(embed.footer.text).toBe("0/2 hedef çevrimiçi");

    const webField = embed.fields.find((f) => f.name === "Web");
    expect(webField?.value).toContain("🔴 Çevrimdışı");
    expect(webField?.value).toContain("timeout");
  });

  it("formats a mixed report with yellow color", () => {
    const results: TargetCheckResult[] = [
      { name: "Web", ok: true, latencyMs: 5 },
      { name: "Minecraft", ok: false, error: "timeout" },
    ];
    const embed = formatStatusEmbed(
      results,
      { loadAvg1: 0.8, freeMemPct: 45, diskFreePct: 10 },
      CHECKED_AT,
    );

    expect(embed.color).toBe(0xf1c40f);
    expect(embed.footer.text).toBe("1/2 hedef çevrimiçi");
  });

  it("shows 'bilinmiyor' for disk stats when diskFreePct is null", () => {
    const embed = formatStatusEmbed(
      [{ name: "Web", ok: true, latencyMs: 1 }],
      { loadAvg1: 0.1, freeMemPct: 90, diskFreePct: null },
      CHECKED_AT,
    );

    const systemField = embed.fields.find((f) => f.name === "Sistem Durumu");
    expect(systemField?.value).toContain("Boş disk: bilinmiyor");
  });
});
