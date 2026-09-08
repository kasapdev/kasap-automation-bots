import { describe, it, expect, beforeEach } from "vitest";
import { fetchExchangeRate, convertPrice, resetExchangeRateCache } from "../src/currency.js";

function createFetchMock(rate: number) {
  return async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ rates: { EUR: rate } }),
    text: async () => "",
  });
}

describe("fetchExchangeRate", () => {
  beforeEach(() => {
    resetExchangeRateCache();
  });

  it("returns 1 without calling fetch when the currencies are the same", async () => {
    let calls = 0;
    const fetchMock = async () => {
      calls++;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({}), text: async () => "" };
    };

    const rate = await fetchExchangeRate("USD", "USD", fetchMock as unknown as typeof fetch);

    expect(rate).toBe(1);
    expect(calls).toBe(0);
  });

  it("returns 1 without calling fetch when the currencies differ only by case", async () => {
    let calls = 0;
    const fetchMock = async () => {
      calls++;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({}), text: async () => "" };
    };

    const rate = await fetchExchangeRate("usd", "USD", fetchMock as unknown as typeof fetch);

    expect(rate).toBe(1);
    expect(calls).toBe(0);
  });

  it("fetches and returns the rate for two different currencies", async () => {
    const fetchMock = createFetchMock(0.92);

    const rate = await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch);

    expect(rate).toBe(0.92);
  });

  it("requests the expected Frankfurter URL", async () => {
    let requestedUrl: string | undefined;
    const fetchMock = async (url: string) => {
      requestedUrl = url;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ rates: { EUR: 0.9 } }), text: async () => "" };
    };

    await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch);

    expect(requestedUrl).toBe("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR");
  });

  it("caches a fetched rate and does not refetch within the TTL", async () => {
    let calls = 0;
    const fetchMock = async () => {
      calls++;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ rates: { EUR: 0.9 } }), text: async () => "" };
    };
    let clock = 0;
    const now = () => clock;

    await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch, now);
    clock += 30 * 60 * 1000; // 30 minutes later, still within the 1h TTL
    const rate = await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch, now);

    expect(rate).toBe(0.9);
    expect(calls).toBe(1);
  });

  it("refetches once the cached rate is older than the TTL", async () => {
    let calls = 0;
    const fetchMock = async () => {
      calls++;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ rates: { EUR: 0.9 } }), text: async () => "" };
    };
    let clock = 0;
    const now = () => clock;

    await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch, now);
    clock += 61 * 60 * 1000; // just past the 1h TTL
    await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch, now);

    expect(calls).toBe(2);
  });

  it("caches USD->EUR and EUR->USD independently", async () => {
    let calls = 0;
    const fetchMock = async (url: string) => {
      calls++;
      const symbols = new URL(url).searchParams.get("symbols");
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ rates: { [symbols as string]: 1.1 } }),
        text: async () => "",
      };
    };

    await fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch);
    await fetchExchangeRate("EUR", "USD", fetchMock as unknown as typeof fetch);

    expect(calls).toBe(2);
  });

  it("throws a clear error on a non-OK response", async () => {
    const fetchMock = async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
      text: async () => "unknown base currency",
    });

    await expect(
      fetchExchangeRate("XYZ", "EUR", fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/404/);
  });

  it("throws a clear error when the response is missing the requested rate", async () => {
    const fetchMock = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ rates: {} }),
      text: async () => "",
    });

    await expect(
      fetchExchangeRate("USD", "EUR", fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/EUR/);
  });
});

describe("convertPrice", () => {
  it("multiplies the value by the rate", () => {
    expect(convertPrice(100, 0.92)).toBeCloseTo(92, 10);
  });

  it("returns the same value for a rate of 1", () => {
    expect(convertPrice(129.99, 1)).toBe(129.99);
  });

  it("returns 0 for a value of 0 regardless of rate", () => {
    expect(convertPrice(0, 1.5)).toBe(0);
  });
});
