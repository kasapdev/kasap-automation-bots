import type { AppConfig } from "./config.js";
import { getAccessToken } from "./auth.js";
import { fetchItemPrice } from "./ebayClient.js";
import { readState, writeState, type PriceState } from "./state.js";
import { diffPrice } from "./priceDiff.js";
import { buildPriceDropEmbed, postDiscordWebhook } from "./discordNotify.js";
import { fetchExchangeRate, convertPrice } from "./currency.js";

export interface PollDeps {
  fetchImpl?: typeof fetch;
  getAccessTokenFn?: typeof getAccessToken;
  fetchItemPriceFn?: typeof fetchItemPrice;
  readStateFn?: typeof readState;
  writeStateFn?: typeof writeState;
  postDiscordWebhookFn?: typeof postDiscordWebhook;
  fetchExchangeRateFn?: typeof fetchExchangeRate;
  now?: () => Date;
}

export interface PollItemResult {
  itemId: string;
  label: string;
  dropped: boolean;
  /** Previous/current price in the item's own listing currency (not normalized). */
  previous: number | undefined;
  current: number | undefined;
  currency: string | undefined;
  /** Current price converted into `config.baseCurrency`, used for the actual diff. */
  currentBase: number | undefined;
  baseCurrency: string;
  error?: string;
}

/**
 * Runs one polling pass over every configured item: fetches its current
 * price, diffs it against the stored state, notifies Discord on a drop, and
 * persists the updated state once at the end. All I/O is injectable via
 * `deps` so this can be unit tested without touching the real network or disk.
 */
export async function pollOnce(config: AppConfig, deps: PollDeps = {}): Promise<PollItemResult[]> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const getAccessTokenFn = deps.getAccessTokenFn ?? getAccessToken;
  const fetchItemPriceFn = deps.fetchItemPriceFn ?? fetchItemPrice;
  const readStateFn = deps.readStateFn ?? readState;
  const writeStateFn = deps.writeStateFn ?? writeState;
  const postDiscordWebhookFn = deps.postDiscordWebhookFn ?? postDiscordWebhook;
  const fetchExchangeRateFn = deps.fetchExchangeRateFn ?? fetchExchangeRate;
  const now = deps.now ?? ((): Date => new Date());

  const state: PriceState = readStateFn(config.stateFile);
  const results: PollItemResult[] = [];

  const token = await getAccessTokenFn(config.ebayClientId, config.ebayClientSecret, fetchImpl);

  for (const item of config.items) {
    const previousEntry = state[item.itemId];
    const previous = previousEntry?.lastPrice;
    // Only trust the stored base-currency price if it was computed against
    // the *same* base currency this run is using - if BASE_CURRENCY changed
    // since the last run (or the state file predates this feature and never
    // stored one), comparing against it would silently mix currencies.
    const previousBase =
      previousEntry?.baseCurrency === config.baseCurrency ? previousEntry.lastPriceBase : undefined;

    try {
      const price = await fetchItemPriceFn(item.itemId, token, fetchImpl);
      const rate = await fetchExchangeRateFn(price.currency, config.baseCurrency, fetchImpl);
      const currentBase = convertPrice(price.value, rate);
      const diff = diffPrice(previousBase, currentBase);

      if (diff.dropped && previousBase !== undefined) {
        const original =
          price.currency.toUpperCase() !== config.baseCurrency.toUpperCase()
            ? { value: price.value, currency: price.currency }
            : undefined;
        const embed = buildPriceDropEmbed(item, previousBase, currentBase, config.baseCurrency, original);
        await postDiscordWebhookFn(config.discordWebhookUrl, embed, fetchImpl);
      }

      state[item.itemId] = {
        lastPrice: price.value,
        currency: price.currency,
        lastCheckedIso: now().toISOString(),
        lastPriceBase: currentBase,
        baseCurrency: config.baseCurrency,
      };

      results.push({
        itemId: item.itemId,
        label: item.label,
        dropped: diff.dropped,
        previous,
        current: price.value,
        currency: price.currency,
        currentBase,
        baseCurrency: config.baseCurrency,
      });
    } catch (err) {
      // Leave the stored state for this item untouched on failure, but still
      // report the failure in the summary so the caller can log/alert on it.
      results.push({
        itemId: item.itemId,
        label: item.label,
        dropped: false,
        previous,
        current: undefined,
        currency: previousEntry?.currency,
        currentBase: undefined,
        baseCurrency: config.baseCurrency,
        error: (err as Error).message,
      });
    }
  }

  writeStateFn(config.stateFile, state);

  return results;
}

/**
 * Sums every successfully-checked item's current price, normalized into the
 * base currency, so a portfolio of items listed in different currencies can
 * be compared/totaled meaningfully. Items that errored this pass (no
 * `currentBase`) are skipped rather than treated as zero.
 */
export function sumBaseCurrencyValue(results: PollItemResult[]): number {
  return results.reduce((total, result) => total + (result.currentBase ?? 0), 0);
}
