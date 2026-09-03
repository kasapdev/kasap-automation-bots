import { readFile } from "node:fs/promises";

/**
 * Shape of the JSON config file that lists which domains/hosts to monitor.
 *
 * Example:
 * {
 *   "domains": ["example.com"],
 *   "sslHosts": ["example.com"],
 *   "warnDaysThreshold": 30
 * }
 */
export interface ExpiryConfig {
  /** Domains to WHOIS-query for registration expiry. */
  domains: string[];
  /** Hosts (no scheme, no path) to check TLS certificate expiry for, over port 443. */
  sslHosts: string[];
  /** Warn when a domain/certificate is within this many days of expiring. */
  warnDaysThreshold: number;
}

const DEFAULT_CONFIG_FILE = "./expiry-config.json";

/**
 * Loads the expiry config from the JSON file pointed to by the EXPIRY_CONFIG_FILE
 * env var (default "./expiry-config.json").
 */
export async function loadConfig(
  configFilePath: string = process.env["EXPIRY_CONFIG_FILE"] ?? DEFAULT_CONFIG_FILE
): Promise<ExpiryConfig> {
  const raw = await readFile(configFilePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<ExpiryConfig>;

  const domains = Array.isArray(parsed.domains) ? parsed.domains : [];
  const sslHosts = Array.isArray(parsed.sslHosts) ? parsed.sslHosts : [];
  const warnDaysThreshold =
    typeof parsed.warnDaysThreshold === "number" ? parsed.warnDaysThreshold : 30;

  return { domains, sslHosts, warnDaysThreshold };
}

/** Reads the optional Discord webhook URL from the environment. */
export function getDiscordWebhookUrl(): string | undefined {
  const url = process.env["DISCORD_WEBHOOK_URL"];
  return url && url.trim().length > 0 ? url : undefined;
}
