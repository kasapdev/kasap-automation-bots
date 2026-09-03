const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

// Refresh this many milliseconds before the token actually expires, so a
// request in flight never gets rejected mid-call because of a token that
// expired seconds ago.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;

interface EbayTokenResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * Gets a valid eBay OAuth2 access token using the client-credentials flow,
 * caching it in module state and only re-fetching once it is close to expiry.
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - EXPIRY_SAFETY_MARGIN_MS > now) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetchImpl(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(EBAY_SCOPE)}`,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `eBay OAuth token request failed: ${response.status} ${response.statusText}. ${body}`
    );
  }

  const data = (await response.json()) as EbayTokenResponse;
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") {
    throw new Error("eBay OAuth token response is missing access_token or expires_in.");
  }

  cachedToken = {
    token: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/** Test-only helper to reset the module-level token cache between test cases. */
export function resetAccessTokenCache(): void {
  cachedToken = null;
}
