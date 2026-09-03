import { Client, GatewayIntentBits } from "discord.js";

/** Slash commands and button clicks arrive as interactions, not messages, so
 * we don't need GuildMessages/MessageContent - Guilds alone is enough to see
 * the guild, its channels and roles when creating/managing ticket channels. */
export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}
