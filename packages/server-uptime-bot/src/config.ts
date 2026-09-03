import { readFileSync } from "node:fs";

export interface UptimeTarget {
  name: string;
  host: string;
  port: number;
}

export interface UptimeConfig {
  targets: UptimeTarget[];
  /** Discord webhook URL. Undefined means "dry-run" (console output only). */
  discordWebhookUrl: string | undefined;
  checkTimeoutMs: number;
  pollIntervalMs: number;
}

const DEFAULT_TARGETS_FILE = "./uptime-targets.json";
const DEFAULT_CHECK_TIMEOUT_MS = 5000;
const DEFAULT_POLL_INTERVAL_MS = 300000; // 5 minutes

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadTargets(filePath: string): UptimeTarget[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new Error(
      `Hedef listesi dosyası okunamadı: "${filePath}". UPTIME_TARGETS_FILE env değişkenini ` +
        `kontrol edin ya da uptime-targets.example.json örneğinden bir dosya oluşturun. ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Hedef listesi dosyası geçerli JSON değil: "${filePath}". ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Hedef listesi dosyası bir JSON dizisi olmalı: "${filePath}".`);
  }

  return parsed.map((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).name !== "string" ||
      typeof (entry as Record<string, unknown>).host !== "string" ||
      typeof (entry as Record<string, unknown>).port !== "number"
    ) {
      throw new Error(
        `Hedef listesi dosyasındaki ${index}. girdi geçersiz: { name: string, host: string, port: number } bekleniyor.`,
      );
    }
    const item = entry as { name: string; host: string; port: number };
    return { name: item.name, host: item.host, port: item.port };
  });
}

export function loadConfig(): UptimeConfig {
  const targetsFile = process.env.UPTIME_TARGETS_FILE ?? DEFAULT_TARGETS_FILE;
  return {
    targets: loadTargets(targetsFile),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
    checkTimeoutMs: parsePositiveInt(process.env.CHECK_TIMEOUT_MS, DEFAULT_CHECK_TIMEOUT_MS),
    pollIntervalMs: parsePositiveInt(process.env.POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS),
  };
}

/** Throws a clear English error if posting to Discord is attempted without a webhook URL. */
export function requireWebhookUrl(config: UptimeConfig): string {
  if (!config.discordWebhookUrl) {
    throw new Error(
      "DISCORD_WEBHOOK_URL is not set. Set it in your .env file, or run with --dry-run to " +
        "print the status report to the console instead of posting it.",
    );
  }
  return config.discordWebhookUrl;
}
