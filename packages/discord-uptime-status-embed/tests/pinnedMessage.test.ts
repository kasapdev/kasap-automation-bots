import { describe, expect, it, vi } from "vitest";
import type { Message, TextChannel } from "discord.js";
import { findExistingStatusMessage, publishStatusEmbed } from "../src/pinnedMessage.js";
import { buildStatusEmbed } from "../src/embedBuilder.js";

const BOT_USER_ID = "bot-1";

function fakeChannel(overrides: {
  fetch?: ReturnType<typeof vi.fn>;
  fetchPinned?: ReturnType<typeof vi.fn>;
  send?: ReturnType<typeof vi.fn>;
}): TextChannel {
  return {
    client: { user: { id: BOT_USER_ID } },
    messages: {
      fetch: overrides.fetch ?? vi.fn(),
      fetchPinned: overrides.fetchPinned ?? vi.fn(),
    },
    send: overrides.send ?? vi.fn(),
  } as unknown as TextChannel;
}

function fakeMessage(overrides: {
  id?: string;
  authorId?: string;
  embeds?: Array<{ title: string | null }>;
  edit?: ReturnType<typeof vi.fn>;
  pin?: ReturnType<typeof vi.fn>;
}): Message {
  return {
    id: overrides.id ?? "message-1",
    author: { id: overrides.authorId ?? BOT_USER_ID },
    embeds: overrides.embeds ?? [{ title: "Berilis Sunucu Durumu" }],
    edit: overrides.edit ?? vi.fn(),
    pin: overrides.pin ?? vi.fn(),
  } as unknown as Message;
}

describe("findExistingStatusMessage", () => {
  it("fetches by known message ID when given, and returns it", async () => {
    const message = fakeMessage({ id: "known-1" });
    const fetch = vi.fn().mockResolvedValue(message);
    const channel = fakeChannel({ fetch });

    const result = await findExistingStatusMessage(channel, "known-1");

    expect(fetch).toHaveBeenCalledWith("known-1");
    expect(result).toBe(message);
  });

  it("returns undefined when the known message ID cannot be fetched (e.g. deleted)", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Unknown Message"));
    const channel = fakeChannel({ fetch });

    const result = await findExistingStatusMessage(channel, "gone-1");

    expect(result).toBeUndefined();
  });

  it("finds a pinned message authored by the bot with a matching embed title", async () => {
    const match = fakeMessage({ id: "pinned-match", embeds: [{ title: "Berilis Sunucu Durumu" }] });
    const other = fakeMessage({ id: "pinned-other", embeds: [{ title: "Something Else" }] });
    const fetchPinned = vi.fn().mockResolvedValue(
      new Map([
        [other.id, other],
        [match.id, match],
      ]),
    );
    const channel = fakeChannel({ fetchPinned });

    const result = await findExistingStatusMessage(channel);

    expect(fetchPinned).toHaveBeenCalledTimes(1);
    expect(result).toBe(match);
  });

  it("returns undefined when no pinned message matches", async () => {
    const other = fakeMessage({ id: "pinned-other", embeds: [{ title: "Something Else" }] });
    const fetchPinned = vi.fn().mockResolvedValue(new Map([[other.id, other]]));
    const channel = fakeChannel({ fetchPinned });

    const result = await findExistingStatusMessage(channel);

    expect(result).toBeUndefined();
  });

  it("ignores pinned messages authored by someone other than the bot", async () => {
    const notBot = fakeMessage({
      id: "pinned-other-author",
      authorId: "someone-else",
      embeds: [{ title: "Berilis Sunucu Durumu" }],
    });
    const fetchPinned = vi.fn().mockResolvedValue(new Map([[notBot.id, notBot]]));
    const channel = fakeChannel({ fetchPinned });

    const result = await findExistingStatusMessage(channel);

    expect(result).toBeUndefined();
  });
});

describe("publishStatusEmbed", () => {
  const embed = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 5 }], "2026-09-04T12:00:00.000Z");

  it("edits the existing message in place rather than sending a new one", async () => {
    const edited = fakeMessage({ id: "existing-1" });
    const edit = vi.fn().mockResolvedValue(edited);
    const existingMessage = fakeMessage({ id: "existing-1", edit });
    const send = vi.fn();
    const channel = fakeChannel({ send });

    const result = await publishStatusEmbed(channel, embed, existingMessage);

    expect(edit).toHaveBeenCalledWith({ embeds: [embed] });
    expect(send).not.toHaveBeenCalled();
    expect(result).toBe(edited);
  });

  it("sends a new message and pins it when there is no existing message", async () => {
    const pin = vi.fn().mockResolvedValue(undefined);
    const sentMessage = fakeMessage({ id: "new-1", pin });
    const send = vi.fn().mockResolvedValue(sentMessage);
    const channel = fakeChannel({ send });

    const result = await publishStatusEmbed(channel, embed);

    expect(send).toHaveBeenCalledWith({ embeds: [embed] });
    expect(pin).toHaveBeenCalledTimes(1);
    expect(result).toBe(sentMessage);
  });
});
