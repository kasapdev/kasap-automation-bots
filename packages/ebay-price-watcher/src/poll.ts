import type { AppConfig } from "./config.js";
import { getAccessToken } from "./auth.js";
import { fetchItemPrice } from "./ebayClient.js";
import { readState, writeState, type PriceState } from "./state.js";
import { diffPrice } from "./priceDiff.js";
import { buildPriceDropEmbed, postDiscordWebhook } from "./discordNotify.js";

export interface PollDeps {
  fetchImpl?: typeof fetch;
  getAccessTokenFn?: typeof getAccessToken;
  fetchItemPriceFn?: typeof fetchItemPrice;
  readStateFn?: typeof readState;
  writeStateFn?: typeof writeState;
  postDiscordWebhookFn?: typeof postDiscordWebhook;
  now?: () => Date;
}

export interface PollItemResult {
  itemId: string;
  label: string;
  dropped: boolean;
  previous: number | undefined;
  current: number | undefined;
  currency: string | undefined;
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
  const now = deps.now ?? ((): Date => new Date());

  const state: PriceState = readStateFn(config.stateFile);
  const results: PollItemResult[] = [];

  const token = await getAccessTokenFn(config.ebayClientId, config.ebayClientSecret, fetchImpl);

  for (const item of config.items) {
    const previousEntry = state[item.itemId];
    const previous = previousEntry?.lastPrice;

    try {
      const price = await fetchItemPriceFn(item.itemId, token, fetchImpl);
      const diff = diffPrice(previous, price.value);

      if (diff.dropped && previous !== undefined) {
        const embed = buildPriceDropEmbed(item, previous, price.value, price.currency);
        await postDiscordWebhookFn(config.discordWebhookUrl, embed, fetchImpl);
      }

      state[item.itemId] = {
        lastPrice: price.value,
        currency: price.currency,
        lastCheckedIso: now().toISOString(),
      };

      results.push({
        itemId: item.itemId,
        label: item.label,
        dropped: diff.dropped,
        previous,
        current: price.value,
        currency: price.currency,
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
        error: (err as Error).message,
      });
    }
  }

  writeStateFn(config.stateFile, state);

  return results;
}
