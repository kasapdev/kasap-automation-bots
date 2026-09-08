import type { WatchedItem } from "./config.js";

export interface PriceDropEmbed {
  title: string;
  description: string;
  color: number;
  timestamp: string;
}

function formatCurrency(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

/** The item's raw listing price, when it differs from the comparison currency. */
export interface OriginalPriceInfo {
  value: number;
  currency: string;
}

/**
 * Pure function that builds a Turkish Discord embed describing a price drop.
 *
 * `previous`/`current`/`currency` are the values the drop was actually
 * detected against - normally the listing's own currency, but when the
 * watcher is normalizing multiple currencies into one `baseCurrency` (see
 * `poll.ts`), these are the base-currency amounts instead. When that's the
 * case, pass `original` (the item's raw listing price) so the embed still
 * shows the price the way it's actually listed on eBay, alongside the
 * normalized comparison.
 */
export function buildPriceDropEmbed(
  item: WatchedItem,
  previous: number,
  current: number,
  currency: string,
  original?: OriginalPriceInfo
): PriceDropEmbed {
  const deltaAbs = previous - current;
  const deltaPct = previous === 0 ? 0 : (deltaAbs / previous) * 100;

  const formattedPrevious = formatCurrency(previous, currency);
  const formattedCurrent = formatCurrency(current, currency);
  const formattedPct = deltaPct.toFixed(1);

  const originalLine =
    original && original.currency.toUpperCase() !== currency.toUpperCase()
      ? `\n(orijinal liste fiyatı: ${formatCurrency(original.value, original.currency)})`
      : "";

  return {
    title: "Fiyat Düştü! 📉",
    description:
      `**${item.label}** ürününün fiyatı düştü: ${formattedPrevious} → ${formattedCurrent} ` +
      `(%${formattedPct} indirim).${originalLine}`,
    color: 0x2ecc71,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Posts a price-drop embed to a Discord webhook URL.
 */
export async function postDiscordWebhook(
  webhookUrl: string,
  embed: PriceDropEmbed,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<void> {
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord webhook request failed: ${response.status} ${response.statusText}. ${body}`
    );
  }
}
