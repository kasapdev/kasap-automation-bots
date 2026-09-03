import { describe, expect, it, vi } from "vitest";
import { postStatusEmbed } from "../src/discordNotify.js";

describe("postStatusEmbed", () => {
  it("POSTs the embed wrapped in { embeds: [embed] } to the given webhook URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 204, statusText: "No Content" }),
    );

    const embed = { title: "Sunucu Durum Raporu" };
    await postStatusEmbed("https://discord.com/api/webhooks/test", embed, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/webhooks/test");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ embeds: [embed] });
  });

  it("throws when the webhook responds with a non-ok status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(
      postStatusEmbed("https://discord.com/api/webhooks/test", { title: "x" }, fetchMock),
    ).rejects.toThrow(/404/);
  });
});
