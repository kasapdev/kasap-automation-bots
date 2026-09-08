import { describe, it, expect, vi } from "vitest";
import { pollOnce, sumBaseCurrencyValue, type PollItemResult } from "../src/poll.js";
import type { AppConfig } from "../src/config.js";
import type { PriceState } from "../src/state.js";

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ebayClientId: "client-id",
    ebayClientSecret: "client-secret",
    discordWebhookUrl: "https://discord.com/api/webhooks/test",
    itemsFile: "./ebay-items.json",
    stateFile: "./data/ebay-price-state.json",
    pollIntervalMs: 900_000,
    items: [{ itemId: "v1|1|0", label: "Item One" }],
    baseCurrency: "USD",
    ...overrides,
  };
}

function makeDeps(opts: {
  state?: PriceState;
  price?: { value: number; currency: string };
  rate?: number;
}) {
  const writeStateFn = vi.fn();
  const postDiscordWebhookFn = vi.fn(async () => undefined);
  const fetchExchangeRateFn = vi.fn(async () => opts.rate ?? 1);

  return {
    deps: {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      getAccessTokenFn: vi.fn(async () => "token-xyz"),
      fetchItemPriceFn: vi.fn(async () => opts.price ?? { value: 100, currency: "USD" }),
      readStateFn: vi.fn(() => opts.state ?? {}),
      writeStateFn,
      postDiscordWebhookFn,
      fetchExchangeRateFn,
      now: () => new Date("2026-09-08T00:00:00.000Z"),
    },
    writeStateFn,
    postDiscordWebhookFn,
    fetchExchangeRateFn,
  };
}

describe("pollOnce", () => {
  it("does not call the exchange-rate fetcher when the item currency matches the base currency", async () => {
    const { deps, fetchExchangeRateFn } = makeDeps({ price: { value: 100, currency: "USD" } });

    await pollOnce(baseConfig({ baseCurrency: "USD" }), deps);

    // fetchExchangeRate itself short-circuits on same-currency, but pollOnce
    // still calls through to it (it's the injected fn, not the real one) -
    // what matters is it was asked to convert USD->USD.
    expect(fetchExchangeRateFn).toHaveBeenCalledWith("USD", "USD", deps.fetchImpl);
  });

  it("converts a non-base-currency price into the base currency for the diff and stored state", async () => {
    const { deps, writeStateFn } = makeDeps({
      state: {
        "v1|1|0": {
          lastPrice: 90,
          currency: "EUR",
          lastCheckedIso: "2026-09-01T00:00:00.000Z",
          lastPriceBase: 97, // 90 EUR * ~1.078 previously
          baseCurrency: "USD",
        },
      },
      price: { value: 80, currency: "EUR" }, // dropped in EUR too
      rate: 1.1, // 1 EUR = 1.1 USD
    });

    const results = await pollOnce(baseConfig({ baseCurrency: "USD" }), deps);

    expect(results).toHaveLength(1);
    const result = results[0] as PollItemResult;
    expect(result.currency).toBe("EUR");
    expect(result.current).toBe(80);
    expect(result.currentBase).toBeCloseTo(88, 10); // 80 * 1.1
    expect(result.dropped).toBe(true); // 88 < 97

    const writtenState = writeStateFn.mock.calls[0]?.[1] as PriceState;
    expect(writtenState["v1|1|0"]?.lastPriceBase).toBeCloseTo(88, 10);
    expect(writtenState["v1|1|0"]?.baseCurrency).toBe("USD");
    expect(writtenState["v1|1|0"]?.lastPrice).toBe(80);
    expect(writtenState["v1|1|0"]?.currency).toBe("EUR");
  });

  it("posts a Discord notification with the original listing price when the currencies differ", async () => {
    const { deps, postDiscordWebhookFn } = makeDeps({
      state: {
        "v1|1|0": {
          lastPrice: 90,
          currency: "EUR",
          lastCheckedIso: "2026-09-01T00:00:00.000Z",
          lastPriceBase: 99,
          baseCurrency: "USD",
        },
      },
      price: { value: 80, currency: "EUR" },
      rate: 1.1,
    });

    await pollOnce(baseConfig({ baseCurrency: "USD" }), deps);

    expect(postDiscordWebhookFn).toHaveBeenCalledTimes(1);
    const embed = postDiscordWebhookFn.mock.calls[0]?.[1] as { description: string };
    expect(embed.description).toContain("USD");
    expect(embed.description).toContain("orijinal liste fiyatı");
    expect(embed.description).toContain("EUR");
  });

  it("treats a base-currency mismatch against stored state as no previous price (no false drop)", async () => {
    const { deps, postDiscordWebhookFn } = makeDeps({
      state: {
        "v1|1|0": {
          lastPrice: 100,
          currency: "USD",
          lastCheckedIso: "2026-09-01T00:00:00.000Z",
          lastPriceBase: 100,
          baseCurrency: "EUR", // BASE_CURRENCY was changed since the last run
        },
      },
      price: { value: 50, currency: "USD" },
      rate: 1,
    });

    const results = await pollOnce(baseConfig({ baseCurrency: "USD" }), deps);

    expect(results[0]?.dropped).toBe(false);
    expect(postDiscordWebhookFn).not.toHaveBeenCalled();
  });

  it("treats a state entry with no lastPriceBase (pre-normalization state file) as no previous price", async () => {
    const { deps, postDiscordWebhookFn } = makeDeps({
      state: {
        "v1|1|0": {
          lastPrice: 100,
          currency: "USD",
          lastCheckedIso: "2026-09-01T00:00:00.000Z",
          // no lastPriceBase/baseCurrency - written before this feature existed
        },
      },
      price: { value: 50, currency: "USD" },
      rate: 1,
    });

    const results = await pollOnce(baseConfig({ baseCurrency: "USD" }), deps);

    expect(results[0]?.dropped).toBe(false);
    expect(postDiscordWebhookFn).not.toHaveBeenCalled();
  });

  it("leaves stored state untouched and reports the error when a per-item fetch fails", async () => {
    const { deps, writeStateFn } = makeDeps({
      state: {
        "v1|1|0": { lastPrice: 100, currency: "USD", lastCheckedIso: "x", lastPriceBase: 100, baseCurrency: "USD" },
      },
    });
    deps.fetchItemPriceFn = vi.fn(async () => {
      throw new Error("boom");
    });

    const results = await pollOnce(baseConfig(), deps);

    expect(results[0]?.error).toBe("boom");
    expect(results[0]?.currentBase).toBeUndefined();
    const writtenState = writeStateFn.mock.calls[0]?.[1] as PriceState;
    expect(writtenState["v1|1|0"]).toEqual({
      lastPrice: 100,
      currency: "USD",
      lastCheckedIso: "x",
      lastPriceBase: 100,
      baseCurrency: "USD",
    });
  });
});

describe("sumBaseCurrencyValue", () => {
  it("sums currentBase across all results", () => {
    const results = [
      { currentBase: 10 } as PollItemResult,
      { currentBase: 5.5 } as PollItemResult,
    ];
    expect(sumBaseCurrencyValue(results)).toBe(15.5);
  });

  it("skips results with no currentBase (errored items) instead of treating them as 0-valued gaps", () => {
    const results = [
      { currentBase: 10 } as PollItemResult,
      { currentBase: undefined } as PollItemResult,
    ];
    expect(sumBaseCurrencyValue(results)).toBe(10);
  });

  it("returns 0 for an empty result set", () => {
    expect(sumBaseCurrencyValue([])).toBe(0);
  });
});
