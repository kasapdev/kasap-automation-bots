import { describe, expect, it, vi } from "vitest";
import { runTriage } from "../src/run.js";
import type { LabelRule } from "../src/labelRules.js";

const rules: LabelRule[] = [
  { label: "bug", keywords: ["crash", "error"] },
  { label: "documentation", keywords: ["readme", "docs"] },
];

describe("runTriage", () => {
  it("applies matched labels and posts a duplicate comment when both are found", async () => {
    const loadLabelRules = vi.fn().mockReturnValue(rules);
    const listOpenIssues = vi.fn().mockResolvedValue([
      { number: 10, title: "App crashes on startup" },
      { number: 11, title: "Totally unrelated feature idea" },
    ]);
    const addLabels = vi.fn().mockResolvedValue(undefined);
    const postComment = vi.fn().mockResolvedValue(undefined);

    const summary = await runTriage(
      {
        owner: "kasapdev",
        repo: "demo-repo",
        issueNumber: 42,
        issueTitle: "App crashes on launch",
        issueBody: "Getting an exception every time",
        token: "tok_123",
        labelRulesPath: "unused-because-loadLabelRules-is-mocked.json",
        similarityThreshold: 0.4,
      },
      { loadLabelRules, listOpenIssues, addLabels, postComment },
    );

    // labels: "crash" matches bug via title, no doc keyword present
    expect(loadLabelRules).toHaveBeenCalledWith("unused-because-loadLabelRules-is-mocked.json");
    expect(summary.labelsApplied).toEqual(["bug"]);
    expect(addLabels).toHaveBeenCalledWith("kasapdev", "demo-repo", 42, ["bug"], "tok_123");

    // duplicates: "App crashes on launch" vs "App crashes on startup" should be similar enough
    expect(summary.duplicates.length).toBeGreaterThan(0);
    expect(summary.duplicates[0]!.number).toBe(10);

    expect(postComment).toHaveBeenCalledTimes(1);
    const [owner, repo, issueNumber, body, token] = postComment.mock.calls[0]!;
    expect(owner).toBe("kasapdev");
    expect(repo).toBe("demo-repo");
    expect(issueNumber).toBe(42);
    expect(token).toBe("tok_123");
    expect(body).toContain("#10");
    expect(body).toContain("App crashes on startup");
    expect(body).toMatch(/similarity: 0\.\d\d/);
  });

  it("does not call addLabels when no labels match", async () => {
    const loadLabelRules = vi.fn().mockReturnValue(rules);
    const listOpenIssues = vi.fn().mockResolvedValue([]);
    const addLabels = vi.fn().mockResolvedValue(undefined);
    const postComment = vi.fn().mockResolvedValue(undefined);

    const summary = await runTriage(
      {
        owner: "kasapdev",
        repo: "demo-repo",
        issueNumber: 1,
        issueTitle: "Please add a new setting",
        issueBody: "Would like a toggle for X",
        token: "tok_123",
        labelRulesPath: "rules.json",
        similarityThreshold: 0.6,
      },
      { loadLabelRules, listOpenIssues, addLabels, postComment },
    );

    expect(summary.labelsApplied).toEqual([]);
    expect(addLabels).not.toHaveBeenCalled();
  });

  it("does not call postComment when no duplicates are found", async () => {
    const loadLabelRules = vi.fn().mockReturnValue(rules);
    const listOpenIssues = vi.fn().mockResolvedValue([{ number: 5, title: "Completely different topic" }]);
    const addLabels = vi.fn().mockResolvedValue(undefined);
    const postComment = vi.fn().mockResolvedValue(undefined);

    const summary = await runTriage(
      {
        owner: "kasapdev",
        repo: "demo-repo",
        issueNumber: 2,
        issueTitle: "App crashes on startup",
        issueBody: "error thrown",
        token: "tok_123",
        labelRulesPath: "rules.json",
        similarityThreshold: 0.9,
      },
      { loadLabelRules, listOpenIssues, addLabels, postComment },
    );

    expect(summary.duplicates).toEqual([]);
    expect(postComment).not.toHaveBeenCalled();
    // bug label still applied independently of duplicate detection
    expect(addLabels).toHaveBeenCalledWith("kasapdev", "demo-repo", 2, ["bug"], "tok_123");
  });

  it("returns a summary object describing labels applied and duplicates found", async () => {
    const loadLabelRules = vi.fn().mockReturnValue(rules);
    const listOpenIssues = vi.fn().mockResolvedValue([]);
    const addLabels = vi.fn().mockResolvedValue(undefined);
    const postComment = vi.fn().mockResolvedValue(undefined);

    const summary = await runTriage(
      {
        owner: "o",
        repo: "r",
        issueNumber: 1,
        issueTitle: "no keywords here",
        issueBody: "nothing relevant",
        token: "t",
        labelRulesPath: "rules.json",
        similarityThreshold: 0.5,
      },
      { loadLabelRules, listOpenIssues, addLabels, postComment },
    );

    expect(summary).toEqual({ labelsApplied: [], duplicates: [] });
  });
});
