export interface FormattedPr {
  number: number;
  title: string;
  parsed: {
    subject: string;
    scope: string | null;
    breaking: boolean;
  };
}

export interface FormatReleaseNotesOptions {
  compareUrl?: string;
}

/**
 * Fixed display order and section labels for known Conventional-Commit
 * types. Any type not listed here still renders (via the "other" bucket
 * merge logic in {@link formatReleaseNotes}), but only these get a
 * dedicated, nicely-labeled section — "other" is always emitted last,
 * regardless of Map iteration order or where it appears in this list.
 */
const SECTION_ORDER: Array<{ type: string; label: string }> = [
  { type: "feat", label: "### 🚀 Features" },
  { type: "fix", label: "### 🐛 Fixes" },
  { type: "docs", label: "### 📚 Docs" },
  { type: "refactor", label: "### ♻️ Refactors" },
  { type: "perf", label: "### ⚡ Performance" },
  { type: "test", label: "### ✅ Tests" },
  { type: "chore", label: "### 🧹 Chores" },
  { type: "other", label: "### 📦 Other Changes" },
];

function formatBullet(pr: FormattedPr): string {
  const prefix = pr.parsed.breaking ? "⚠️ " : "";
  return `- ${prefix}${pr.parsed.subject} (#${pr.number})`;
}

/**
 * Renders a grouped PR map into a Markdown release body.
 *
 * - Sections appear in a fixed, sensible order for known types; "other" is
 *   always last regardless of Map iteration order.
 * - A section header is only emitted for types actually present in `grouped`
 *   (empty/absent groups are skipped entirely).
 * - Each PR renders as `- {subject} (#{number})`, prefixed with `⚠️ ` when
 *   the parsed title carried a breaking-change marker (`!`).
 * - When `opts.compareUrl` is given, a compare-link footer line is appended;
 *   otherwise the output ends with the last section (no footer).
 */
export function formatReleaseNotes(
  grouped: Map<string, FormattedPr[]>,
  opts: FormatReleaseNotesOptions = {}
): string {
  const sections: string[] = [];
  const emitted = new Set<string>(["other"]);

  for (const { type, label } of SECTION_ORDER) {
    if (type === "other") continue; // emitted last, below
    const prs = grouped.get(type);
    if (!prs || prs.length === 0) continue;

    emitted.add(type);
    sections.push([label, ...prs.map(formatBullet)].join("\n"));
  }

  // Any type not covered by SECTION_ORDER (e.g. valid-but-unlisted
  // Conventional-Commit types like "build" or "ci") still gets rendered,
  // using its raw type name as the header — inserted before "other" so
  // "other" always stays last regardless of Map iteration order.
  for (const [type, prs] of grouped) {
    if (emitted.has(type) || prs.length === 0) continue;
    emitted.add(type);
    sections.push([`### ${type}`, ...prs.map(formatBullet)].join("\n"));
  }

  // "other" always last.
  const otherPrs = grouped.get("other");
  if (otherPrs && otherPrs.length > 0) {
    sections.push(
      ["### 📦 Other Changes", ...otherPrs.map(formatBullet)].join("\n")
    );
  }

  if (opts.compareUrl) {
    sections.push(`**Full Changelog**: ${opts.compareUrl}`);
  }

  return sections.join("\n\n");
}
