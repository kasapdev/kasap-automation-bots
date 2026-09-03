export interface ItemPrice {
  value: number;
  currency: string;
}

interface EbayItemResponse {
  price?: {
    value?: string;
    currency?: string;
  };
}

/**
 * Fetches the current price of an eBay item via the Browse API.
 */
export async function fetchItemPrice(
  itemId: string,
  accessToken: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<ItemPrice> {
  const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemId)}`;
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `eBay Browse API request failed for item "${itemId}": ${response.status} ${response.statusText}. ${body}`
    );
  }

  const data = (await response.json()) as EbayItemResponse;
  const rawValue = data.price?.value;
  const currency = data.price?.currency;

  if (typeof rawValue !== "string" || typeof currency !== "string") {
    throw new Error(
      `eBay Browse API response for item "${itemId}" is missing price.value or price.currency.`
    );
  }

  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    throw new Error(
      `eBay Browse API response for item "${itemId}" has a non-numeric price.value: "${rawValue}".`
    );
  }

  return { value, currency };
}
