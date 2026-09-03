import { describe, expect, it } from "vitest";
import { formatReleaseNotes } from "../src/formatReleaseNotes.js";
import { groupPrsByType } from "../src/groupByType.js";

describe("formatReleaseNotes", () => {
  it("renders a representative grouped map with exact expected markdown", () => {
    const grouped = groupPrsByType([
      { number: 10, title: "feat(auth): add login" },
      { number: 11, title: "fix: crash on startup" },
      { number: 12, title: "docs: update README" },
      { number: 13, title: "Bump some random thing" },
    ]);

    const result = formatReleaseNotes(grouped);

    expect(result).toBe(
      [
        "### 🚀 Features",
        "- add login (#10)",
        "",
        "### 🐛 Fixes",
        "- crash on startup (#11)",
        "",
        "### 📚 Docs",
        "- update README (#12)",
        "",
        "### 📦 Other Changes",
        "- Bump some random thing (#13)",
      ].join("\n")
    );
  });

  it("omits section headers for groups that are empty or absent", () => {
    const grouped = groupPrsByType([{ number: 1, title: "fix: only this" }]);

    const result = formatReleaseNotes(grouped);

    expect(result).toBe(["### 🐛 Fixes", "- only this (#1)"].join("\n"));
    expect(result).not.toContain("Features");
    expect(result).not.toContain("Chores");
  });

  it("marks breaking-change entries with a warning emoji", () => {
    const grouped = groupPrsByType([
      { number: 1, title: "feat(api)!: remove old endpoint" },
      { number: 2, title: "feat: add new thing" },
    ]);

    const result = formatReleaseNotes(grouped);

    expect(result).toBe(
      [
        "### 🚀 Features",
        "- ⚠️ remove old endpoint (#1)",
        "- add new thing (#2)",
      ].join("\n")
    );
  });

  it("appends a compare-link footer when compareUrl is given", () => {
    const grouped = groupPrsByType([{ number: 1, title: "feat: x" }]);

    const result = formatReleaseNotes(grouped, {
      compareUrl: "https://github.com/owner/repo/compare/v1.0.0...v1.1.0",
    });

    expect(result).toBe(
      [
        "### 🚀 Features",
        "- x (#1)",
        "",
        "**Full Changelog**: https://github.com/owner/repo/compare/v1.0.0...v1.1.0",
      ].join("\n")
    );
  });

  it("handles a missing compareUrl gracefully (no footer, no trailing blank line)", () => {
    const grouped = groupPrsByType([{ number: 1, title: "feat: x" }]);

    const result = formatReleaseNotes(grouped, {});

    expect(result).toBe(["### 🚀 Features", "- x (#1)"].join("\n"));
    expect(result.endsWith("\n")).toBe(false);
  });

  it("returns an empty string for an empty grouped map", () => {
    expect(formatReleaseNotes(new Map())).toBe("");
  });

  it("puts 'other' last even when it appears first in Map iteration order", () => {
    const grouped = new Map();
    grouped.set("other", [
      {
        number: 1,
        title: "Random change",
        parsed: { subject: "Random change", scope: null, breaking: false },
      },
    ]);
    grouped.set("feat", [
      {
        number: 2,
        title: "feat: something",
        parsed: { subject: "something", scope: null, breaking: false },
      },
    ]);

    const result = formatReleaseNotes(grouped);

    expect(result).toBe(
      [
        "### 🚀 Features",
        "- something (#2)",
        "",
        "### 📦 Other Changes",
        "- Random change (#1)",
      ].join("\n")
    );
  });

  it("renders all known section labels in the documented fixed order", () => {
    const grouped = groupPrsByType([
      { number: 1, title: "test: add tests" },
      { number: 2, title: "perf: speed up query" },
      { number: 3, title: "refactor: simplify logic" },
      { number: 4, title: "chore(deps): bump foo" },
      { number: 5, title: "feat: new thing" },
      { number: 6, title: "fix: bug" },
      { number: 7, title: "docs: typo" },
    ]);

    const result = formatReleaseNotes(grouped);
    const headers = result
      .split("\n")
      .filter((line) => line.startsWith("### "));

    expect(headers).toEqual([
      "### 🚀 Features",
      "### 🐛 Fixes",
      "### 📚 Docs",
      "### ♻️ Refactors",
      "### ⚡ Performance",
      "### ✅ Tests",
      "### 🧹 Chores",
    ]);
  });

  it("renders a section for a valid-but-unlisted conventional type using its raw name", () => {
    const grouped = groupPrsByType([{ number: 1, title: "ci: fix pipeline" }]);

    const result = formatReleaseNotes(grouped);

    expect(result).toBe(["### ci", "- fix pipeline (#1)"].join("\n"));
  });
});
