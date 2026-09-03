import type { ButtonInteraction, TextChannel } from "discord.js";
import type { TicketStore } from "../ticketLimiter.js";

/** Resolves which user owns a ticket channel (see `openTicket.ts`'s `channelOwners` map). */
export type OwnerUserIdResolver = (channelId: string) => string | undefined;

/**
 * Handles a "Close Ticket" button click: confirms in Turkish, deletes the
 * channel, and decrements the owning user's open-ticket count. The actual
 * `setTimeout`-based delay before deletion (if desired) belongs in the
 * wiring in `index.ts`, not here, to keep this function directly testable.
 */
export async function handleCloseTicketInteraction(
  interaction: ButtonInteraction,
  store: TicketStore,
  ownerUserIdResolver: OwnerUserIdResolver,
): Promise<void> {
  await interaction.reply({
    content: "Talep kapatılıyor, bu kanal birazdan silinecek.",
  });

  // Ticket channels are always regular guild text channels (created as
  // ChannelType.GuildText in openTicket.ts), so this cast is safe here even
  // though discord.js types `interaction.channel` broadly as TextBasedChannel.
  const channel = interaction.channel as TextChannel;
  const ownerId = ownerUserIdResolver(channel.id);
  if (ownerId) {
    store.decrement(ownerId);
  }

  await channel.delete();
}
