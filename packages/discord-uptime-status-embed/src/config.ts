import { readFileSync } from "node:fs";

export interface StatusTarget {
  name: string;
  host: string;
  port: number;
}

export interface StatusBotConfig {
  discordToken: string;
  statusChannelId: string;
  /** Known message ID to edit in place, if the operator has already recorded one. */
  statusMessageId: string | undefined;
  targets: StatusTarget[];
  checkTimeoutMs: number;
  pollIntervalMs: number;
}

const DEFAULT_TARGETS_FILE = "./status-targets.json";
const DEFAULT_CHECK_TIMEOUT_MS = 5000;
const DEFAULT_POLL_INTERVAL_MS = 60000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} .env dosyasında tanımlı değil. .env.example dosyasına bakın.`);
  }
  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadTargets(filePath: string): StatusTarget[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new Error(
      `Hedef listesi dosyası okunamadı: "${filePath}". STATUS_TARGETS_FILE env değişkenini ` +
        `kontrol edin ya da status-targets.example.json örneğinden bir dosya oluşturun. ` +
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

export function loadConfig(): StatusBotConfig {
  const targetsFile = process.env.STATUS_TARGETS_FILE ?? DEFAULT_TARGETS_FILE;
  return {
    discordToken: requireEnv("DISCORD_TOKEN"),
    statusChannelId: requireEnv("STATUS_CHANNEL_ID"),
    statusMessageId: process.env.STATUS_MESSAGE_ID || undefined,
    targets: loadTargets(targetsFile),
    checkTimeoutMs: parsePositiveInt(process.env.CHECK_TIMEOUT_MS, DEFAULT_CHECK_TIMEOUT_MS),
    pollIntervalMs: parsePositiveInt(process.env.POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS),
  };
}
