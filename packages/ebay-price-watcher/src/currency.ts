// How long a fetched exchange rate stays valid before it is re-requested.
// Rates move slowly enough (they're daily ECB reference rates) that
// re-fetching on every poll pass would be wasteful; an hour keeps a
// long-running --watch process reasonably fresh without hammering the API.
const RATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedRate {
  rate: number;
  fetchedAtMs: number;
}

const rateCache = new Map<string, CachedRate>();

function cacheKey(from: string, to: string): string {
  return `${from}->${to}`;
}

interface FrankfurterResponse {
  rates?: Record<string, number>;
}

/**
 * Fetches the exchange rate to convert 1 unit of `from` into `to`, using the
 * free Frankfurter API (ECB reference rates, no API key required). Same as
 * every other external call in this package, `fetchImpl` is injectable so
 * tests never hit the real network.
 *
 * Same-currency conversions short-circuit to `1` without any network call -
 * this is the common case (most watched items share one currency) and keeps
 * `pollOnce` free of exchange-rate calls entirely unless they're needed.
 *
 * Results are cached in memory per currency pair for `RATE_CACHE_TTL_MS`, so
 * a single poll pass over many items in the same non-base currency only
 * fetches the rate once.
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  now: () => number = Date.now
): Promise<number> {
  const fromCode = from.trim().toUpperCase();
  const toCode = to.trim().toUpperCase();

  if (fromCode === toCode) {
    return 1;
  }

  const key = cacheKey(fromCode, toCode);
  const cached = rateCache.get(key);
  if (cached && now() - cached.fetchedAtMs < RATE_CACHE_TTL_MS) {
    return cached.rate;
  }

  const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(fromCode)}&symbols=${encodeURIComponent(toCode)}`;
  const response = await fetchImpl(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Exchange rate request failed for ${fromCode}->${toCode}: ${response.status} ${response.statusText}. ${body}`
    );
  }

  const data = (await response.json()) as FrankfurterResponse;
  const rate = data.rates?.[toCode];

  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new Error(
      `Exchange rate response for ${fromCode}->${toCode} is missing a numeric rate for "${toCode}".`
    );
  }

  rateCache.set(key, { rate, fetchedAtMs: now() });
  return rate;
}

/**
 * Converts a price using an already-fetched rate (1 unit of the source
 * currency = `rate` units of the target currency). Pure, no I/O - kept
 * separate from `fetchExchangeRate` so callers that already have a rate
 * (e.g. from the cache) don't need to thread currency codes back through.
 */
export function convertPrice(value: number, rate: number): number {
  return value * rate;
}

/** Test-only helper to reset the module-level rate cache between test cases. */
export function resetExchangeRateCache(): void {
  rateCache.clear();
}
