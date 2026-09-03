import { describe, expect, it, vi } from "vitest";
import type { ChatInputCommandInteraction } from "discord.js";
import { handleOpenTicketInteraction } from "../src/interactions/openTicket.js";
import { createInMemoryTicketStore } from "../src/ticketLimiter.js";
import type { TicketBotConfig } from "../src/config.js";

const baseConfig: TicketBotConfig = {
  discordToken: "test-token",
  ticketCategoryId: "category-1",
  staffRoleId: "staff-role-1",
  maxTicketsPerUser: 1,
  openTicketChannelId: "open-channel-1",
};

function fakeInteraction(overrides: { userId?: string; username?: string }): {
  interaction: ChatInputCommandInteraction;
  reply: ReturnType<typeof vi.fn>;
  createChannel: ReturnType<typeof vi.fn>;
  channelSend: ReturnType<typeof vi.fn>;
} {
  const reply = vi.fn();
  const channelSend = vi.fn();
  const createChannel = vi.fn().mockResolvedValue({ id: "new-channel-id", send: channelSend });

  const interaction = {
    user: { id: overrides.userId ?? "user-1", username: overrides.username ?? "kayra" },
    client: { user: { id: "bot-1" } },
    guild: {
      id: "guild-1",
      channels: { create: createChannel },
    },
    reply,
  } as unknown as ChatInputCommandInteraction;

  return { interaction, reply, createChannel, channelSend };
}

describe("handleOpenTicketInteraction", () => {
  it("creates a ticket channel and replies with the channel mention when under the limit", async () => {
    const store = createInMemoryTicketStore();
    const { interaction, reply, createChannel } = fakeInteraction({});

    await handleOpenTicketInteraction(interaction, baseConfig, store, () => 1);

    expect(createChannel).toHaveBeenCalledTimes(1);
    const createArgs = createChannel.mock.calls[0]![0];
    expect(createArgs.name).toBe("ticket-kayra-1");

    expect(reply).toHaveBeenCalledWith({
      content: "Talebiniz oluşturuldu: <#new-channel-id>",
      ephemeral: true,
    });
    expect(store.getOpenCount("user-1")).toBe(1);
  });

  it("replies with the Turkish limit message and does not create a channel when over the limit", async () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    const { interaction, reply, createChannel } = fakeInteraction({});

    await handleOpenTicketInteraction(interaction, baseConfig, store, () => 1);

    expect(createChannel).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: "Zaten açık bir talebiniz var, yeni bir talep açmadan önce lütfen onu kapatın.",
      ephemeral: true,
    });
    expect(store.getOpenCount("user-1")).toBe(1);
  });
});
