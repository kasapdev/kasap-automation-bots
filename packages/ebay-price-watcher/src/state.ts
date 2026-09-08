import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface ItemState {
  /** Last price seen, in the currency the eBay listing itself was quoted in. */
  lastPrice: number;
  /** Currency `lastPrice` is denominated in, as returned by the eBay Browse API. */
  currency: string;
  lastCheckedIso: string;
  /**
   * `lastPrice` converted into `baseCurrency` at the time it was stored - this
   * is what price drops are actually detected against, so items are never
   * compared across mismatched currencies. Optional because state files
   * written before multi-currency normalization was added won't have it yet;
   * callers must treat a missing value the same as "no previous price".
   */
  lastPriceBase?: number;
  /** The base currency `lastPriceBase` was computed against when it was stored. */
  baseCurrency?: string;
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

  try {
    return JSON.parse(raw) as PriceState;
  } catch (err) {
    throw new Error(
      `State file at "${path}" is not valid JSON: ${(err as Error).message}. ` +
        `Delete or fix it (it will be recreated on the next successful run) if you can't repair it by hand.`
    );
  }
}

/**
 * Writes the price-state JSON file, pretty-printed, creating the parent
 * directory if it doesn't exist yet.
 */
export function writeState(path: string, state: PriceState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
