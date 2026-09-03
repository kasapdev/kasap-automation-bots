import { describe, it, expect, vi } from "vitest";
import { buildPriceDropEmbed, postDiscordWebhook } from "../src/discordNotify.js";

describe("buildPriceDropEmbed", () => {
  it("builds a Turkish embed describing the price drop", () => {
    const embed = buildPriceDropEmbed(
      { itemId: "v1|123456789|0", label: "Örnek ürün" },
      100,
      80,
      "USD"
    );

    expect(embed.title).toBe("Fiyat Düştü! 📉");
    expect(embed.description).toContain("Örnek ürün");
    expect(embed.description).toContain("100.00 USD");
    expect(embed.description).toContain("80.00 USD");
    expect(embed.description).toContain("%20.0");
  });
});

describe("postDiscordWebhook", () => {
  it("posts the embed to the given webhook URL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 204,
      statusText: "No Content",
      text: async () => "",
    }));

    const embed = buildPriceDropEmbed(
      { itemId: "v1|123456789|0", label: "Örnek ürün" },
      100,
      80,
      "USD"
    );

    await postDiscordWebhook(
      "https://discord.com/api/webhooks/test",
      embed,
      fetchMock as unknown as typeof fetch
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    if (!call) {
      throw new Error("expected fetch to have been called");
    }
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/webhooks/test");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string) as { embeds: unknown[] };
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0]).toEqual(embed);
  });

  it("throws a clear error when the webhook responds with a non-OK status", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "invalid webhook",
    }));

    const embed = buildPriceDropEmbed(
      { itemId: "v1|123456789|0", label: "Örnek ürün" },
      100,
      80,
      "USD"
    );

    await expect(
      postDiscordWebhook(
        "https://discord.com/api/webhooks/test",
        embed,
        fetchMock as unknown as typeof fetch
      )
    ).rejects.toThrow(/400/);
  });
});
