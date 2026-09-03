import "dotenv/config";
import { loadConfig } from "./config.js";
import { pollOnce } from "./poll.js";

function log(message: string): void {
  console.log(`[ebay-price-watcher] ${message}`);
}

async function runOnce(): Promise<void> {
  const config = loadConfig();
  log(`${config.items.length} ürün kontrol ediliyor...`);

  const results = await pollOnce(config);

  for (const result of results) {
    if (result.error) {
      log(`Hata - ${result.label} (${result.itemId}): ${result.error}`);
      continue;
    }
    if (result.dropped) {
      log(
        `Fiyat düştü: ${result.label} (${result.itemId}) - ${result.previous} -> ${result.current} ${result.currency}`
      );
    } else {
      log(`Değişiklik yok: ${result.label} (${result.itemId}) - ${result.current} ${result.currency}`);
    }
  }
}

async function main(): Promise<void> {
  const watch = process.argv.includes("--watch") || process.env.WATCH === "true";

  await runOnce();

  if (!watch) {
    return;
  }

  const config = loadConfig();
  log(`İzleme modu aktif - her ${config.pollIntervalMs} ms'de bir fiyatlar kontrol edilecek.`);

  setInterval(() => {
    runOnce().catch((err) => {
      console.error(`[ebay-price-watcher] Kontrol sırasında hata oluştu: ${(err as Error).message}`);
    });
  }, config.pollIntervalMs);
}

main().catch((err) => {
  console.error(`[ebay-price-watcher] Başlatılamadı: ${(err as Error).message}`);
  process.exitCode = 1;
});
