import type { Message, TextChannel } from "discord.js";
import type { StatusEmbed } from "./embedBuilder.js";

/**
 * Finds the message this bot should keep editing in place.
 *
 * If `knownMessageId` is given (the operator recorded it in `.env` from a previous
 * run), fetch it directly - if it was deleted, `fetch` rejects and we resolve
 * `undefined` so the caller falls back to creating a new one.
 *
 * Otherwise, search the channel's pinned messages for one authored by this bot
 * whose first embed's title matches `markerText`. This lets the bot recover its
 * own status message after a restart even before the operator has copied
 * STATUS_MESSAGE_ID into `.env`.
 */
export async function findExistingStatusMessage(
  channel: TextChannel,
  knownMessageId?: string,
  markerText = "Berilis Sunucu Durumu",
): Promise<Message | undefined> {
  if (knownMessageId) {
    try {
      return await channel.messages.fetch(knownMessageId);
    } catch {
      return undefined;
    }
  }

  const pinned = await channel.messages.fetchPinned();
  const botUserId = channel.client.user?.id;

  for (const message of pinned.values()) {
    if (botUserId !== undefined && message.author.id !== botUserId) continue;
    const firstEmbed = message.embeds[0];
    if (firstEmbed?.title === markerText) {
      return message;
    }
  }

  return undefined;
}

/**
 * Publishes the status embed: edits `existingMessage` in place if given, otherwise
 * sends a new message and pins it (so `findExistingStatusMessage` can recover it on
 * a future restart even without a recorded STATUS_MESSAGE_ID).
 */
export async function publishStatusEmbed(
  channel: TextChannel,
  embed: StatusEmbed,
  existingMessage?: Message,
): Promise<Message> {
  if (existingMessage) {
    return existingMessage.edit({ embeds: [embed] });
  }

  const sent = await channel.send({ embeds: [embed] });
  await sent.pin();
  return sent;
}
