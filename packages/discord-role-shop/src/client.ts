import { Client, GatewayIntentBits, Partials } from "discord.js";

/** MessageContent is a privileged intent - enable it for the bot application in the
 * Discord Developer Portal (Bot > Privileged Gateway Intents), or every incoming
 * message.content arrives empty and points can never be awarded from message activity. */
export function createDiscordClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });
}
