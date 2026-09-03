import { readFileSync } from "node:fs";

export interface LabelRule {
  label: string;
  keywords: string[];
}

interface LabelRulesFile {
  rules: LabelRule[];
}

/**
 * Reads and parses a JSON file of label rules from disk.
 * Expected shape: { "rules": [{ "label": "bug", "keywords": ["crash", ...] }, ...] }
 */
export function loadLabelRules(configPath: string): LabelRule[] {
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as LabelRulesFile;
  return parsed.rules;
}

/**
 * Pure matcher: given an issue title/body and a set of label rules, returns
 * the deduped list of labels whose rule has at least one keyword appearing
 * as a case-insensitive substring of the combined title+body text.
 */
export function matchLabels(title: string, body: string, rules: LabelRule[]): string[] {
  const combined = `${title}\n${body}`.toLowerCase();
  const matched = new Set<string>();

  for (const rule of rules) {
    const hasMatch = rule.keywords.some((keyword) => combined.includes(keyword.toLowerCase()));
    if (hasMatch) {
      matched.add(rule.label);
    }
  }

  return [...matched];
}
