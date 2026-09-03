import "dotenv/config";
import { getDiscordWebhookUrl, loadConfig } from "./config.js";
import { lookupDomain } from "./whoisClient.js";
import { parseExpiryDate } from "./expiryParser.js";
import { checkSslExpiry } from "./sslCheck.js";
import { isExpiringSoon } from "./expiryCheck.js";
import { buildExpiryWarningEmbed, postDiscordWebhook } from "./discordNotify.js";
import type { ExpiryWarningItem } from "./discordNotify.js";

async function checkDomain(domain: string, warnDaysThreshold: number): Promise<ExpiryWarningItem | null> {
  const raw = await lookupDomain(domain);
  const expiryDate = parseExpiryDate(raw);

  if (!expiryDate) {
    console.log(`[HATA] ${domain}: WHOIS yanıtından son kullanma tarihi ayrıştırılamadı.`);
    return null;
  }

  const { warn, daysRemaining } = isExpiringSoon(expiryDate, warnDaysThreshold, new Date());
  const dateLabel = expiryDate.toISOString().slice(0, 10);

  if (warn) {
    console.log(`[UYARI] ${domain} (alan adı) - ${daysRemaining} gün kaldı (${dateLabel})`);
    return { name: domain, type: "domain", daysRemaining, expiryDate };
  }

  console.log(`[TAMAM] ${domain} (alan adı) - ${daysRemaining} gün kaldı (${dateLabel})`);
  return null;
}

async function checkSslHost(host: string, warnDaysThreshold: number): Promise<ExpiryWarningItem | null> {
  const expiryDate = await checkSslExpiry(host);
  const { warn, daysRemaining } = isExpiringSoon(expiryDate, warnDaysThreshold, new Date());
  const dateLabel = expiryDate.toISOString().slice(0, 10);

  if (warn) {
    console.log(`[UYARI] ${host} (SSL sertifikası) - ${daysRemaining} gün kaldı (${dateLabel})`);
    return { name: host, type: "ssl", daysRemaining, expiryDate };
  }

  console.log(`[TAMAM] ${host} (SSL sertifikası) - ${daysRemaining} gün kaldı (${dateLabel})`);
  return null;
}

async function main(): Promise<void> {
  const config = await loadConfig();
  const warnings: ExpiryWarningItem[] = [];

  for (const domain of config.domains) {
    try {
      const warning = await checkDomain(domain, config.warnDaysThreshold);
      if (warning) warnings.push(warning);
    } catch (err) {
      console.log(`[HATA] ${domain} için WHOIS sorgusu başarısız oldu: ${String(err)}`);
    }
  }

  for (const host of config.sslHosts) {
    try {
      const warning = await checkSslHost(host, config.warnDaysThreshold);
      if (warning) warnings.push(warning);
    } catch (err) {
      console.log(`[HATA] ${host} için SSL kontrolü başarısız oldu: ${String(err)}`);
    }
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (warnings.length > 0 && webhookUrl) {
    const embed = buildExpiryWarningEmbed(warnings);
    try {
      await postDiscordWebhook(webhookUrl, embed);
      console.log(`Discord bildirimi gönderildi (${warnings.length} uyarı).`);
    } catch (err) {
      console.log(`[HATA] Discord bildirimi gönderilemedi: ${String(err)}`);
    }
  } else if (warnings.length > 0) {
    console.log(`${warnings.length} uyarı var, ancak DISCORD_WEBHOOK_URL ayarlanmadığı için bildirim gönderilmedi.`);
  } else {
    console.log("Tüm alan adları ve SSL sertifikaları güvenli aralıkta.");
  }
}

main().catch((err) => {
  console.error("Beklenmeyen bir hata oluştu:", err);
  process.exitCode = 1;
});
