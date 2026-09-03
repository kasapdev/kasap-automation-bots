import "dotenv/config";
import { Events, SlashCommandBuilder } from "discord.js";
import { loadConfig } from "./config.js";
import { createDiscordClient } from "./client.js";
import { createInMemoryTicketStore } from "./ticketLimiter.js";
import { handleOpenTicketInteraction, resolveTicketOwner } from "./interactions/openTicket.js";
import { handleCloseTicketInteraction } from "./interactions/closeTicket.js";

const OPEN_TICKET_COMMAND_NAME = "ticket-ac";
const CLOSE_TICKET_CUSTOM_ID = "close-ticket";

export const openTicketCommand = new SlashCommandBuilder()
  .setName(OPEN_TICKET_COMMAND_NAME)
  .setDescription("Yeni bir destek talebi açar");

async function main(): Promise<void> {
  const config = loadConfig();
  const store = createInMemoryTicketStore();

  // Simple incrementing counter for ticket-channel names. Restarting the bot
  // resets this, which is fine - it's only used for a human-readable suffix,
  // not as a durable ticket ID.
  let nextTicketNumber = 1;
  const ticketNumberProvider = (): number => nextTicketNumber++;

  const client = createDiscordClient();

  client.on(Events.InteractionCreate, (interaction) => {
    void (async () => {
      try {
        if (interaction.isChatInputCommand() && interaction.commandName === OPEN_TICKET_COMMAND_NAME) {
          await handleOpenTicketInteraction(interaction, config, store, ticketNumberProvider);
          return;
        }

        if (interaction.isButton() && interaction.customId === CLOSE_TICKET_CUSTOM_ID) {
          await handleCloseTicketInteraction(interaction, store, resolveTicketOwner);
          return;
        }
      } catch (error) {
        console.error("Etkileşim işlenirken hata oluştu:", error);
      }
    })();
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord Ticket Bot hazır: ${readyClient.user.tag}`);
  });

  await client.login(config.discordToken);
}

main().catch((error: unknown) => {
  console.error("Discord Ticket Bot başlatılamadı:", error);
  process.exit(1);
});
