import "dotenv/config";
import { Events, SlashCommandBuilder } from "discord.js";
import { loadConfig } from "./config.js";
import { createDiscordClient } from "./client.js";
import { initDatabase } from "./db.js";
import { loadShopConfig } from "./shopConfig.js";
import { computeEarnedPoints } from "./activityTracker.js";
import { addPoints, getLastEarnedAt, setLastEarnedAt } from "./economy.js";
import { handleShopInteraction } from "./commands/shop.js";
import { handleBuyInteraction } from "./commands/buy.js";

const SHOP_COMMAND = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Satın alınabilir rolleri listeler.");

const BUY_COMMAND = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("Mağazadan bir rol satın alır.")
  .addStringOption((option) =>
    option.setName("role").setDescription("Satın alınacak rolün kısa adı (/shop'a bakın).").setRequired(true),
  );

async function main(): Promise<void> {
  const config = loadConfig();
  const db = initDatabase(config.dbPath);
  const shopItems = loadShopConfig(config.shopConfigFile);

  const client = createDiscordClient();

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guildId) return;

    const lastEarnedAt = getLastEarnedAt(db, message.author.id, message.guildId);
    const earned = computeEarnedPoints(
      new Date(),
      lastEarnedAt,
      config.pointsPerMessage,
      config.messageCooldownMs,
    );

    if (earned > 0) {
      addPoints(db, message.author.id, message.guildId, earned);
      setLastEarnedAt(db, message.author.id, message.guildId, new Date().toISOString());
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId) return;

    try {
      if (interaction.commandName === "shop") {
        await handleShopInteraction(interaction, shopItems);
      } else if (interaction.commandName === "buy") {
        await handleBuyInteraction(interaction, db, shopItems, interaction.guildId);
      }
    } catch (error) {
      console.error("Etkileşim işlenirken hata oluştu:", error);
      const content = "Bir şeyler ters gitti, lütfen tekrar deneyin.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    }
  });

  client.once(Events.ClientReady, async (readyClient) => {
    await readyClient.application.commands.set([SHOP_COMMAND, BUY_COMMAND]);
    console.log(`Discord Role Shop hazır: ${readyClient.user.tag}`);
  });

  await client.login(config.discordToken);
}

main().catch((error: unknown) => {
  console.error("Discord Role Shop başlatılamadı:", error);
  process.exit(1);
});
