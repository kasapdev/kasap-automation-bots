import "dotenv/config";
import { loadConfig } from "./config.js";
import { tcpPing } from "./tcpCheck.js";
import { getSystemStats } from "./sysStats.js";
import { formatStatusEmbed, type TargetCheckResult } from "./embed.js";
import { postStatusEmbed } from "./discordNotify.js";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || process.env.DRY_RUN === "true";
const isWatch = args.includes("--watch") || process.env.WATCH === "true";

async function runCheckPass(): Promise<void> {
  const config = loadConfig();

  console.log(`[${new Date().toISOString()}] Kontrol başlatılıyor (${config.targets.length} hedef)...`);

  const results: TargetCheckResult[] = await Promise.all(
    config.targets.map(async (target) => {
      const result = await tcpPing(target.host, target.port, config.checkTimeoutMs);
      return { name: target.name, ...result };
    }),
  );

  const stats = await getSystemStats();
  const checkedAtIso = new Date().toISOString();
  const embed = formatStatusEmbed(results, stats, checkedAtIso);

  const upCount = results.filter((r) => r.ok).length;
  console.log(`[${checkedAtIso}] Sonuç: ${upCount}/${results.length} hedef çevrimiçi.`);

  if (config.discordWebhookUrl && !isDryRun) {
    await postStatusEmbed(config.discordWebhookUrl, embed);
    console.log("Durum raporu Discord'a gönderildi.");
  } else {
    console.log("Kuru çalıştırma modu (dry-run): rapor Discord'a gönderilmedi, aşağıda gösteriliyor.");
    console.log(JSON.stringify(embed, null, 2));
  }
}

async function main(): Promise<void> {
  await runCheckPass();

  if (isWatch) {
    const config = loadConfig();
    console.log(`İzleme modu açık: her ${config.pollIntervalMs} ms'de bir tekrar kontrol edilecek.`);
    setInterval(() => {
      runCheckPass().catch((err) => {
        console.error("Kontrol turu sırasında hata oluştu:", err);
      });
    }, config.pollIntervalMs);
  }
}

main().catch((err) => {
  console.error("Beklenmeyen bir hata oluştu:", err);
  process.exitCode = 1;
});
