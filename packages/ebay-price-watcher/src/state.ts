import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface ItemState {
  lastPrice: number;
  currency: string;
  lastCheckedIso: string;
}

export type PriceState = Record<string, ItemState>;

/**
 * Reads the local price-state JSON file. Returns an empty object if the file
 * doesn't exist yet (e.g. first run).
 */
export function readState(path: string): PriceState {
  if (!existsSync(path)) {
    return {};
  }

  const raw = readFileSync(path, "utf-8");
  if (raw.trim() === "") {
    return {};
  }

  return JSON.parse(raw) as PriceState;
}

/**
 * Writes the price-state JSON file, pretty-printed, creating the parent
 * directory if it doesn't exist yet.
 */
export function writeState(path: string, state: PriceState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
