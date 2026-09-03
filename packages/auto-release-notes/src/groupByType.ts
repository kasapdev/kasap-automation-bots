import { parseConventionalPrefix, type ParsedPrefix } from "./parsePrefix.js";

export interface PrRef {
  number: number;
  title: string;
}

export interface GroupedPr extends PrRef {
  parsed: ParsedPrefix;
}

/**
 * Groups PRs by their Conventional-Commit `type` (lowercased), parsed from
 * each PR's title via {@link parseConventionalPrefix}. PRs whose titles don't
 * match the conventional pattern land in the `"other"` bucket. Insertion
 * order within each group mirrors the input array's order (stable grouping).
 */
export function groupPrsByType(
  prs: PrRef[]
): Map<string, GroupedPr[]> {
  const grouped = new Map<string, GroupedPr[]>();

  for (const pr of prs) {
    const parsed = parseConventionalPrefix(pr.title);
    const bucket = grouped.get(parsed.type);
    const entry: GroupedPr = { number: pr.number, title: pr.title, parsed };

    if (bucket) {
      bucket.push(entry);
    } else {
      grouped.set(parsed.type, [entry]);
    }
  }

  return grouped;
}
