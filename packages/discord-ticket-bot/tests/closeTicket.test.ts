import { describe, expect, it, vi } from "vitest";
import type { ButtonInteraction, TextChannel } from "discord.js";
import { handleCloseTicketInteraction } from "../src/interactions/closeTicket.js";
import { createInMemoryTicketStore } from "../src/ticketLimiter.js";

function fakeInteraction(channelId: string): {
  interaction: ButtonInteraction;
  deleteChannel: ReturnType<typeof vi.fn>;
} {
  const deleteChannel = vi.fn().mockResolvedValue(undefined);
  const interaction = {
    reply: vi.fn(),
    channel: { id: channelId, delete: deleteChannel } as unknown as TextChannel,
  } as unknown as ButtonInteraction;

  return { interaction, deleteChannel };
}

describe("handleCloseTicketInteraction", () => {
  it("replies, deletes the channel, and decrements the resolved owner's count", async () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    const { interaction, deleteChannel } = fakeInteraction("channel-1");
    const ownerUserIdResolver = vi.fn().mockReturnValue("user-1");

    await handleCloseTicketInteraction(interaction, store, ownerUserIdResolver);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.any(String) }),
    );
    expect(ownerUserIdResolver).toHaveBeenCalledWith("channel-1");
    expect(deleteChannel).toHaveBeenCalledTimes(1);
    expect(store.getOpenCount("user-1")).toBe(0);
  });

  it("still deletes the channel when the owner cannot be resolved", async () => {
    const store = createInMemoryTicketStore();
    const { interaction, deleteChannel } = fakeInteraction("channel-2");
    const ownerUserIdResolver = vi.fn().mockReturnValue(undefined);

    await handleCloseTicketInteraction(interaction, store, ownerUserIdResolver);

    expect(deleteChannel).toHaveBeenCalledTimes(1);
  });
});
