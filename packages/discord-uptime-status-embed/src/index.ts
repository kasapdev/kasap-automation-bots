import "dotenv/config";
import { Client, Events, GatewayIntentBits, type Message, type TextChannel } from "discord.js";
import { loadConfig } from "./config.js";
import { tcpPing } from "./tcpCheck.js";
import { buildStatusEmbed, type StatusCheckResult, type StatusEmbed } from "./embedBuilder.js";
import { embedsEqual } from "./embedDiff.js";
import { findExistingStatusMessage, publishStatusEmbed } from "./pinnedMessage.js";

/**
 * Only Guilds (to see the guild/channel) and GuildMessages (to fetch and edit the
 * status message, and to search pinned messages) are needed - no MessageContent,
 * since this bot never reads the text content of other users' messages.
 */
function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createDiscordClient();

  // Tracks the last embed we successfully published, purely to decide whether to
  // log "durum değişmedi" vs "durum değişti" between polls. We still call
  // publishStatusEmbed on every poll regardless of this comparison, so the
  // "last checked" timestamp visible in Discord stays fresh even when nothing
  // else changed.
  let lastPublishedEmbed: StatusEmbed | undefined;
  let statusMessage: Message | undefined;

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord Uptime Status Embed hazır: ${readyClient.user.tag}`);

    void (async () => {
      const channel = (await readyClient.channels.fetch(config.statusChannelId)) as TextChannel | null;
      if (!channel) {
        throw new Error(`STATUS_CHANNEL_ID kanalı bulunamadı: "${config.statusChannelId}".`);
      }

      statusMessage = await findExistingStatusMessage(channel, config.statusMessageId);
      if (statusMessage) {
        console.log(`Mevcut durum mesajı bulundu: ${statusMessage.id}`);
      } else {
        console.log("Mevcut durum mesajı bulunamadı, yeni bir mesaj oluşturulacak.");
      }

      const runCheckPass = async (): Promise<void> => {
        const results: StatusCheckResult[] = await Promise.all(
          config.targets.map(async (target) => {
            const result = await tcpPing(target.host, target.port, config.checkTimeoutMs);
            return { name: target.name, ok: result.ok, latencyMs: result.latencyMs };
          }),
        );

        const checkedAtIso = new Date().toISOString();
        const embed = buildStatusEmbed(results, checkedAtIso);

        if (lastPublishedEmbed && embedsEqual(lastPublishedEmbed, embed)) {
          console.log(`[${checkedAtIso}] Durum değişmedi, mesaj güncelleniyor (zaman damgası tazeleniyor).`);
        } else {
          console.log(`[${checkedAtIso}] Durum değişti, mesaj güncelleniyor.`);
        }

        statusMessage = await publishStatusEmbed(channel, embed, statusMessage);
        lastPublishedEmbed = embed;

        if (!config.statusMessageId) {
          console.log(
            `Bu mesaj ID'sini kararlılık için .env dosyasındaki STATUS_MESSAGE_ID değişkenine ` +
              `kopyalayın: ${statusMessage.id}`,
          );
        }
      };

      await runCheckPass();
      setInterval(() => {
        runCheckPass().catch((err) => {
          console.error("Kontrol turu sırasında hata oluştu:", err);
        });
      }, config.pollIntervalMs);
    })().catch((err) => {
      console.error("Başlangıç kontrolü sırasında hata oluştu:", err);
    });
  });

  await client.login(config.discordToken);
}

main().catch((error: unknown) => {
  console.error("Discord Uptime Status Embed başlatılamadı:", error);
  process.exit(1);
});
