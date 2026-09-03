import { describe, expect, it } from "vitest";
import { groupPrsByType } from "../src/groupByType.js";

describe("groupPrsByType", () => {
  it("groups multiple PRs into their respective type buckets", () => {
    const prs = [
      { number: 1, title: "feat: add login" },
      { number: 2, title: "fix: crash on startup" },
      { number: 3, title: "feat: add logout" },
    ];

    const grouped = groupPrsByType(prs);

    expect([...grouped.keys()]).toEqual(["feat", "fix"]);
    expect(grouped.get("feat")).toHaveLength(2);
    expect(grouped.get("fix")).toHaveLength(1);
  });

  it("preserves input order within a group (stable grouping)", () => {
    const prs = [
      { number: 10, title: "feat: first" },
      { number: 20, title: "fix: unrelated" },
      { number: 30, title: "feat: second" },
      { number: 40, title: "feat: third" },
    ];

    const grouped = groupPrsByType(prs);
    const featNumbers = grouped.get("feat")?.map((pr) => pr.number);

    expect(featNumbers).toEqual([10, 30, 40]);
  });

  it("buckets titles that don't match the conventional pattern under 'other'", () => {
    const prs = [
      { number: 1, title: "Bump dependencies" },
      { number: 2, title: "Update README: fix typo" },
    ];

    const grouped = groupPrsByType(prs);

    expect([...grouped.keys()]).toEqual(["other"]);
    expect(grouped.get("other")).toHaveLength(2);
  });

  it("attaches the parsed prefix to each grouped entry", () => {
    const prs = [{ number: 5, title: "feat(auth)!: add SSO" }];
    const grouped = groupPrsByType(prs);
    const entry = grouped.get("feat")?.[0];

    expect(entry).toEqual({
      number: 5,
      title: "feat(auth)!: add SSO",
      parsed: {
        type: "feat",
        scope: "auth",
        breaking: true,
        subject: "add SSO",
      },
    });
  });

  it("returns an empty map for an empty input array", () => {
    expect(groupPrsByType([]).size).toBe(0);
  });

  it("lowercases mixed-case types into the same bucket", () => {
    const prs = [
      { number: 1, title: "Feat: one" },
      { number: 2, title: "feat: two" },
      { number: 3, title: "FEAT: three" },
    ];

    const grouped = groupPrsByType(prs);

    expect([...grouped.keys()]).toEqual(["feat"]);
    expect(grouped.get("feat")).toHaveLength(3);
  });
});
