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

/**
 * Pure function that builds a Turkish Discord embed describing a price drop.
 */
export function buildPriceDropEmbed(
  item: WatchedItem,
  previous: number,
  current: number,
  currency: string
): PriceDropEmbed {
  const deltaAbs = previous - current;
  const deltaPct = previous === 0 ? 0 : (deltaAbs / previous) * 100;

  const formattedPrevious = formatCurrency(previous, currency);
  const formattedCurrent = formatCurrency(current, currency);
  const formattedPct = deltaPct.toFixed(1);

  return {
    title: "Fiyat Düştü! 📉",
    description:
      `**${item.label}** ürününün fiyatı düştü: ${formattedPrevious} → ${formattedCurrent} ` +
      `(%${formattedPct} indirim).`,
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
