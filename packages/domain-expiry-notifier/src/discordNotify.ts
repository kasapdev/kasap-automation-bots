export interface ExpiryWarningItem {
  name: string;
  type: "domain" | "ssl";
  daysRemaining: number;
  expiryDate: Date;
}

/** Discord embed color, sent as a decimal integer (orange/amber warning). */
const WARNING_COLOR = 0xf5a623;

/** Formats a Date as YYYY-MM-DD for display in Turkish messages. */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function typeLabel(type: ExpiryWarningItem["type"]): string {
  return type === "domain" ? "alan adı" : "SSL sertifikası";
}

function daysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} gün önce doldu`;
  }
  return `${daysRemaining} gün kaldı`;
}

/**
 * Builds a Turkish-language Discord embed object summarizing a batch of
 * expiry warnings. Pure function - no network I/O.
 */
export function buildExpiryWarningEmbed(items: ExpiryWarningItem[]): object {
  const description = items
    .map(
      (item) =>
        `${item.name} (${typeLabel(item.type)}) - ${daysRemainingLabel(item.daysRemaining)} (${formatDate(item.expiryDate)})`
    )
    .join("\n");

  return {
    title: "Süre Doluyor Uyarısı ⚠️",
    description,
    color: WARNING_COLOR,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Posts an embed to a Discord webhook URL. `fetchImpl` is injectable so
 * tests can assert the request shape without making a real network call.
 */
export async function postDiscordWebhook(
  webhookUrl: string,
  embed: object,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook isteği başarısız oldu: ${response.status} ${response.statusText}`);
  }
}
