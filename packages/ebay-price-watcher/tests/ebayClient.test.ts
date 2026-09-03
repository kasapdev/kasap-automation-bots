import { describe, it, expect, vi } from "vitest";
import { fetchItemPrice } from "../src/ebayClient.js";

describe("fetchItemPrice", () => {
  it("parses price value and currency from a successful response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ price: { value: "129.99", currency: "USD" } }),
      text: async () => "",
    }));

    const result = await fetchItemPrice(
      "v1|123456789|0",
      "token-xyz",
      fetchMock as unknown as typeof fetch
    );

    expect(result).toEqual({ value: 129.99, currency: "USD" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    if (!call) {
      throw new Error("expected fetch to have been called");
    }
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://api.ebay.com/buy/browse/v1/item/v1%7C123456789%7C0");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token-xyz");
  });

  it("throws a clear error on a non-OK response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
      text: async () => "item not found",
    }));

    await expect(
      fetchItemPrice("v1|000000000|0", "token-xyz", fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/404/);
  });

  it("throws when the response is missing price fields", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
      text: async () => "",
    }));

    await expect(
      fetchItemPrice("v1|000000000|0", "token-xyz", fetchMock as unknown as typeof fetch)
    ).rejects.toThrow(/price\.value/);
  });
});
