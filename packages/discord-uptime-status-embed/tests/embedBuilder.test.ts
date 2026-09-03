import { describe, expect, it } from "vitest";
import { buildStatusEmbed } from "../src/embedBuilder.js";

const CHECKED_AT = "2026-09-04T12:00:00.000Z";

describe("buildStatusEmbed", () => {
  it("uses the green color when every server is up", () => {
    const embed = buildStatusEmbed(
      [
        { name: "A", ok: true, latencyMs: 10 },
        { name: "B", ok: true, latencyMs: 20 },
      ],
      CHECKED_AT,
    );

    expect(embed.color).toBe(0x2ecc71);
    expect(embed.title).toBe("Berilis Sunucu Durumu");
    expect(embed.timestamp).toBe(CHECKED_AT);
    expect(embed.fields).toEqual([
      { name: "A", value: "🟢 Çevrimiçi (10ms)", inline: true },
      { name: "B", value: "🟢 Çevrimiçi (20ms)", inline: true },
    ]);
  });

  it("uses the red color when every server is down", () => {
    const embed = buildStatusEmbed(
      [
        { name: "A", ok: false },
        { name: "B", ok: false },
      ],
      CHECKED_AT,
    );

    expect(embed.color).toBe(0xe74c3c);
    expect(embed.fields).toEqual([
      { name: "A", value: "🔴 Çevrimdışı", inline: true },
      { name: "B", value: "🔴 Çevrimdışı", inline: true },
    ]);
  });

  it("uses the orange color when results are mixed", () => {
    const embed = buildStatusEmbed(
      [
        { name: "A", ok: true, latencyMs: 15 },
        { name: "B", ok: false },
      ],
      CHECKED_AT,
    );

    expect(embed.color).toBe(0xf39c12);
    expect(embed.fields).toEqual([
      { name: "A", value: "🟢 Çevrimiçi (15ms)", inline: true },
      { name: "B", value: "🔴 Çevrimdışı", inline: true },
    ]);
  });

  it("shows latency for up servers", () => {
    const embed = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 123 }], CHECKED_AT);
    expect(embed.fields[0]?.value).toBe("🟢 Çevrimiçi (123ms)");
  });

  it("handles a single server", () => {
    const embed = buildStatusEmbed([{ name: "Solo", ok: true, latencyMs: 5 }], CHECKED_AT);
    expect(embed.color).toBe(0x2ecc71);
    expect(embed.fields).toHaveLength(1);
    expect(embed.fields[0]).toEqual({ name: "Solo", value: "🟢 Çevrimiçi (5ms)", inline: true });
  });

  it("sets a Turkish footer text", () => {
    const embed = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 1 }], CHECKED_AT);
    expect(embed.footer?.text).toBe("Son kontrol edildi");
  });
});
