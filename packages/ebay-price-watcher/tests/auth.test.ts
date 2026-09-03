import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAccessToken, resetAccessTokenCache } from "../src/auth.js";

function createFetchMock(expiresIn: number) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ access_token: "token-abc", expires_in: expiresIn }),
    text: async () => "",
  }));
}

describe("getAccessToken", () => {
  beforeEach(() => {
    resetAccessTokenCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests a token with the expected client-credentials request shape", async () => {
    const fetchMock = createFetchMock(3600);
    const token = await getAccessToken("client-id", "client-secret", fetchMock as unknown as typeof fetch);

    expect(token).toBe("token-abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    if (!call) {
      throw new Error("expected fetch to have been called");
    }
    const [url, init] = call as [string, RequestInit];

    expect(url).toBe("https://api.ebay.com/identity/v1/oauth2/token");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(
      `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`
    );
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(init.body).toBe(
      "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope"
    );
  });

  it("caches the token across calls while it is still valid", async () => {
    const fetchMock = createFetchMock(3600);

    await getAccessToken("client-id", "client-secret", fetchMock as unknown as typeof fetch);
    await getAccessToken("client-id", "client-secret", fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches once the cached token is close enough to expiry", async () => {
    vi.useFakeTimers();
    // 120s TTL, 60s safety margin -> considered stale after ~60s.
    const fetchMock = createFetchMock(120);

    await getAccessToken("client-id", "client-secret", fetchMock as unknown as typeof fetch);
    vi.advanceTimersByTime(90_000);
    await getAccessToken("client-id", "client-secret", fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
