import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLabelRules, matchLabels, type LabelRule } from "../src/labelRules.js";

describe("loadLabelRules", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "issue-triage-bot-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads and parses a real JSON file from disk", () => {
    const configPath = join(dir, "rules.json");
    const contents = {
      rules: [
        { label: "bug", keywords: ["crash", "error", "exception"] },
        { label: "docs", keywords: ["readme"] },
      ],
    };
    writeFileSync(configPath, JSON.stringify(contents), "utf-8");

    const rules = loadLabelRules(configPath);

    expect(rules).toEqual(contents.rules);
  });
});

describe("matchLabels", () => {
  const rules: LabelRule[] = [
    { label: "bug", keywords: ["crash", "error", "exception"] },
    { label: "documentation", keywords: ["docs", "readme"] },
    { label: "question", keywords: ["how do i", "how to"] },
  ];

  it("matches a single rule via a title keyword", () => {
    expect(matchLabels("App crashes on launch", "", rules)).toEqual(["bug"]);
  });

  it("matches multiple rules at once", () => {
    const labels = matchLabels(
      "How do I fix this crash?",
      "Getting an exception on startup",
      rules,
    );
    expect(labels).toContain("bug");
    expect(labels).toContain("question");
    expect(labels).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    expect(matchLabels("Feature request", "Please add dark mode", rules)).toEqual([]);
  });

  it("matches a keyword that only appears in the body, not the title", () => {
    expect(matchLabels("Something is wrong", "Please update the readme", rules)).toEqual([
      "documentation",
    ]);
  });

  it("is case-insensitive", () => {
    expect(matchLabels("APP CRASHES", "", rules)).toEqual(["bug"]);
  });

  it("dedupes a label matched by multiple keywords in the same rule", () => {
    expect(matchLabels("crash and error and exception", "", rules)).toEqual(["bug"]);
  });

  it("returns an empty array when given no rules", () => {
    expect(matchLabels("crash", "error", [])).toEqual([]);
  });
});
