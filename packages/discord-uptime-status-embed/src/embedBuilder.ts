export interface StatusCheckResult {
  name: string;
  ok: boolean;
  latencyMs?: number;
}

export interface StatusEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface StatusEmbed {
  title: string;
  description?: string;
  fields: StatusEmbedField[];
  footer?: { text: string };
  color: number;
  timestamp: string;
}

const TITLE = "Berilis Sunucu Durumu";
const COLOR_ALL_UP = 0x2ecc71; // green
const COLOR_ALL_DOWN = 0xe74c3c; // red
const COLOR_MIXED = 0xf39c12; // orange
const FOOTER_TEXT = "Son kontrol edildi";

function formatField(result: StatusCheckResult): StatusEmbedField {
  if (result.ok) {
    const latency = result.latencyMs !== undefined ? `${result.latencyMs}ms` : "?ms";
    return {
      name: result.name,
      value: `🟢 Çevrimiçi (${latency})`,
      inline: true,
    };
  }
  return {
    name: result.name,
    value: "🔴 Çevrimdışı",
    inline: true,
  };
}

/**
 * Pure function: builds the Turkish status embed payload from a set of TCP check
 * results and a "checked at" timestamp. Color reflects overall status: green when
 * every server is up, red when every server is down, orange when mixed.
 */
export function buildStatusEmbed(results: StatusCheckResult[], checkedAtIso: string): StatusEmbed {
  const upCount = results.filter((r) => r.ok).length;

  let color: number;
  if (results.length === 0 || upCount === results.length) {
    color = COLOR_ALL_UP;
  } else if (upCount === 0) {
    color = COLOR_ALL_DOWN;
  } else {
    color = COLOR_MIXED;
  }

  return {
    title: TITLE,
    fields: results.map(formatField),
    footer: { text: FOOTER_TEXT },
    color,
    timestamp: checkedAtIso,
  };
}
