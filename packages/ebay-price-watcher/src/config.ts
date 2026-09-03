import { readFileSync } from "node:fs";

export interface WatchedItem {
  itemId: string;
  label: string;
}

export interface AppConfig {
  ebayClientId: string;
  ebayClientSecret: string;
  discordWebhookUrl: string;
  itemsFile: string;
  stateFile: string;
  pollIntervalMs: number;
  items: WatchedItem[];
}

const DEFAULT_ITEMS_FILE = "./ebay-items.json";
const DEFAULT_STATE_FILE = "./data/ebay-price-state.json";
const DEFAULT_POLL_INTERVAL_MS = 900_000; // 15 minutes

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function isWatchedItem(entry: unknown): entry is WatchedItem {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }
  const record = entry as Record<string, unknown>;
  return typeof record.itemId === "string" && typeof record.label === "string";
}

function loadItems(itemsFile: string): WatchedItem[] {
  let raw: string;
  try {
    raw = readFileSync(itemsFile, "utf-8");
  } catch (err) {
    throw new Error(
      `Could not read items file at "${itemsFile}". Create it (see ebay-items.example.json) ` +
        `or set EBAY_ITEMS_FILE to point at an existing file. Original error: ${
          (err as Error).message
        }`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Items file at "${itemsFile}" is not valid JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Items file at "${itemsFile}" must contain a JSON array of watched items.`);
  }

  return parsed.map((entry, index) => {
    if (!isWatchedItem(entry)) {
      throw new Error(
        `Invalid entry at index ${index} in "${itemsFile}": expected an object shaped like ` +
          `{ "itemId": string, "label": string }.`
      );
    }
    return { itemId: entry.itemId, label: entry.label };
  });
}

/**
 * Loads configuration from environment variables (see .env.example) and the
 * watched-items JSON file. Throws a clear error if anything required is missing
 * or malformed.
 */
export function loadConfig(): AppConfig {
  const ebayClientId = requireEnv("EBAY_CLIENT_ID");
  const ebayClientSecret = requireEnv("EBAY_CLIENT_SECRET");
  const discordWebhookUrl = requireEnv("DISCORD_WEBHOOK_URL");

  const itemsFile = process.env.EBAY_ITEMS_FILE?.trim() || DEFAULT_ITEMS_FILE;
  const stateFile = process.env.EBAY_STATE_FILE?.trim() || DEFAULT_STATE_FILE;

  const pollIntervalRaw = process.env.POLL_INTERVAL_MS?.trim();
  const pollIntervalMs = pollIntervalRaw ? Number(pollIntervalRaw) : DEFAULT_POLL_INTERVAL_MS;
  if (Number.isNaN(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error(`POLL_INTERVAL_MS must be a positive number, got "${pollIntervalRaw}".`);
  }

  const items = loadItems(itemsFile);

  return {
    ebayClientId,
    ebayClientSecret,
    discordWebhookUrl,
    itemsFile,
    stateFile,
    pollIntervalMs,
    items,
  };
}
