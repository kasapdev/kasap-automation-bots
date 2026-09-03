import { describe, it, expect, vi } from "vitest";
import { buildExpiryWarningEmbed, postDiscordWebhook } from "../src/discordNotify.js";
import type { ExpiryWarningItem } from "../src/discordNotify.js";

describe("buildExpiryWarningEmbed", () => {
  it("builds a Turkish embed with the expected title and color", () => {
    const items: ExpiryWarningItem[] = [
      { name: "example.com", type: "domain", daysRemaining: 12, expiryDate: new Date("2027-03-15T00:00:00Z") },
    ];

    const embed = buildExpiryWarningEmbed(items) as {
      title: string;
      description: string;
      color: number;
      timestamp: string;
    };

    expect(embed.title).toBe("Süre Doluyor Uyarısı ⚠️");
    expect(typeof embed.color).toBe("number");
    expect(typeof embed.timestamp).toBe("string");
  });

  it("formats a domain warning line in Turkish", () => {
    const items: ExpiryWarningItem[] = [
      { name: "example.com", type: "domain", daysRemaining: 12, expiryDate: new Date("2027-03-15T00:00:00Z") },
    ];

    const embed = buildExpiryWarningEmbed(items) as { description: string };

    expect(embed.description).toBe("example.com (alan adı) - 12 gün kaldı (2027-03-15)");
  });

  it("formats an SSL warning line in Turkish", () => {
    const items: ExpiryWarningItem[] = [
      { name: "example.com", type: "ssl", daysRemaining: 5, expiryDate: new Date("2026-02-01T00:00:00Z") },
    ];

    const embed = buildExpiryWarningEmbed(items) as { description: string };

    expect(embed.description).toBe("example.com (SSL sertifikası) - 5 gün kaldı (2026-02-01)");
  });

  it("formats an already-expired item distinctly", () => {
    const items: ExpiryWarningItem[] = [
      { name: "example.com", type: "domain", daysRemaining: -3, expiryDate: new Date("2026-01-01T00:00:00Z") },
    ];

    const embed = buildExpiryWarningEmbed(items) as { description: string };

    expect(embed.description).toContain("3 gün önce doldu");
  });

  it("joins multiple items with newlines, one per line", () => {
    const items: ExpiryWarningItem[] = [
      { name: "example.com", type: "domain", daysRemaining: 12, expiryDate: new Date("2027-03-15T00:00:00Z") },
      { name: "example.com", type: "ssl", daysRemaining: 5, expiryDate: new Date("2026-02-01T00:00:00Z") },
    ];

    const embed = buildExpiryWarningEmbed(items) as { description: string };
    const lines = embed.description.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("alan adı");
    expect(lines[1]).toContain("SSL sertifikası");
  });
});

describe("postDiscordWebhook", () => {
  it("POSTs the embed wrapped in an 'embeds' array with JSON content type", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: "No Content" });
    const embed = { title: "test" };

    await postDiscordWebhook("https://discord.com/api/webhooks/xyz", embed, fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/webhooks/xyz");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body as string)).toEqual({ embeds: [embed] });
  });

  it("throws when the webhook response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" });

    await expect(
      postDiscordWebhook("https://discord.com/api/webhooks/xyz", { title: "test" }, fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow(/400/);
  });
});
