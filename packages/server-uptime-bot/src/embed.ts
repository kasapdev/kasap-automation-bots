export interface TargetCheckResult {
  name: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface StatsSummary {
  loadAvg1: number;
  freeMemPct: number;
  diskFreePct: number | null;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: { text: string };
  timestamp: string;
}

const COLOR_ALL_UP = 0x2ecc71; // green
const COLOR_ALL_DOWN = 0xe74c3c; // red
const COLOR_MIXED = 0xf1c40f; // yellow

function formatTargetField(result: TargetCheckResult): DiscordEmbedField {
  if (result.ok) {
    const latency = result.latencyMs !== undefined ? `${result.latencyMs} ms` : "bilinmiyor";
    return {
      name: result.name,
      value: `🟢 Çevrimiçi (gecikme: ${latency})`,
      inline: true,
    };
  }
  const reason = result.error ?? "bilinmeyen hata";
  return {
    name: result.name,
    value: `🔴 Çevrimdışı (${reason})`,
    inline: true,
  };
}

/** Pure function: builds a Discord embed JSON payload summarizing the check pass, in Turkish. */
export function formatStatusEmbed(
  results: TargetCheckResult[],
  stats: StatsSummary,
  checkedAtIso: string,
): DiscordEmbed {
  const upCount = results.filter((r) => r.ok).length;
  const downCount = results.length - upCount;

  let color = COLOR_MIXED;
  if (results.length === 0 || upCount === results.length) {
    color = COLOR_ALL_UP;
  } else if (downCount === results.length) {
    color = COLOR_ALL_DOWN;
  }

  const targetFields = results.map(formatTargetField);

  const diskLine = stats.diskFreePct !== null ? `${stats.diskFreePct.toFixed(1)}%` : "bilinmiyor";

  const systemField: DiscordEmbedField = {
    name: "Sistem Durumu",
    value: [
      `Sistem yükü (1dk): ${stats.loadAvg1.toFixed(2)}`,
      `Boş RAM: ${stats.freeMemPct.toFixed(1)}%`,
      `Boş disk: ${diskLine}`,
    ].join("\n"),
    inline: false,
  };

  return {
    title: "Sunucu Durum Raporu",
    color,
    fields: [...targetFields, systemField],
    footer: { text: `${upCount}/${results.length} hedef çevrimiçi` },
    timestamp: checkedAtIso,
  };
}
