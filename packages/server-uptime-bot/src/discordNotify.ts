export type FetchLike = typeof fetch;

/** POSTs a pre-built embed to a Discord webhook URL. Fetch is injected for testability. */
export async function postStatusEmbed(
  webhookUrl: string,
  embed: object,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook isteği başarısız oldu: ${response.status} ${response.statusText}`,
    );
  }
}
