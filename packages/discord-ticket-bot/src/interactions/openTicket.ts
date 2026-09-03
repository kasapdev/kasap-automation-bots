import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { TicketBotConfig } from "../config.js";
import type { TicketStore } from "../ticketLimiter.js";
import { canOpenTicket } from "../ticketLimiter.js";
import { buildTicketChannelName, buildTicketPermissionOverwrites } from "../ticketNaming.js";

/** Returns the next ticket number to use in a channel name (e.g. an incrementing counter). */
export type TicketNumberProvider = () => number;

/**
 * Tracks which user opened which ticket channel, so `closeTicket.ts` can
 * decrement the right user's count without discord.js involvement. This is
 * the "implementation detail" mentioned in the task: a real, in-memory
 * `Map<channelId, userId>` populated here and read via `resolveTicketOwner`.
 */
const channelOwners = new Map<string, string>();

export function resolveTicketOwner(channelId: string): string | undefined {
  return channelOwners.get(channelId);
}

const CLOSE_TICKET_CUSTOM_ID = "close-ticket";

export async function handleOpenTicketInteraction(
  interaction: ChatInputCommandInteraction,
  config: TicketBotConfig,
  store: TicketStore,
  ticketNumberProvider: TicketNumberProvider,
): Promise<void> {
  const userId = interaction.user.id;

  if (!canOpenTicket(userId, store, config.maxTicketsPerUser)) {
    await interaction.reply({
      content: "Zaten açık bir talebiniz var, yeni bir talep açmadan önce lütfen onu kapatın.",
      ephemeral: true,
    });
    return;
  }

  const ticketNumber = ticketNumberProvider();
  const channelName = buildTicketChannelName(interaction.user.username, ticketNumber);
  const botUserId = interaction.client.user.id;

  const channel = await interaction.guild!.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId,
    permissionOverwrites: buildTicketPermissionOverwrites(
      interaction.guild!.id,
      userId,
      config.staffRoleId,
      botUserId,
    ),
  });

  channelOwners.set(channel.id, userId);
  store.increment(userId);

  const closeButton = new ButtonBuilder()
    .setCustomId(CLOSE_TICKET_CUSTOM_ID)
    .setLabel("Talebi Kapat")
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

  await channel.send({
    content:
      `Merhaba <@${userId}>! Destek talebiniz oluşturuldu. Sorununuzu buraya yazabilirsiniz, ` +
      "ekibimiz en kısa sürede yardımcı olacaktır. İşiniz bittiğinde aşağıdaki butonla talebi kapatabilirsiniz.",
    components: [row],
  });

  await interaction.reply({
    content: `Talebiniz oluşturuldu: <#${channel.id}>`,
    ephemeral: true,
  });
}
