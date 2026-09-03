import { describe, expect, it, vi } from "vitest";
import { runReleaseNotes } from "../src/run.js";
import { extractMergedPrs } from "../src/githubApi.js";

describe("runReleaseNotes", () => {
  it("wires compareCommits -> extractMergedPrs -> group -> format -> createOrUpdateRelease", async () => {
    const rawCommits = [
      { sha: "s1", commit: { message: "feat: add login (#1)" } },
      { sha: "s2", commit: { message: "fix: crash (#2)" } },
      { sha: "s3", commit: { message: "not a squash merge commit" } },
    ];

    const compareCommitsMock = vi.fn().mockResolvedValue(rawCommits);
    const createOrUpdateReleaseMock = vi.fn().mockResolvedValue({
      id: 1,
      html_url: "https://github.com/kasapdev/demo/releases/tag/v1.1.0",
    });

    const result = await runReleaseNotes(
      {
        owner: "kasapdev",
        repo: "demo",
        previousTag: "v1.0.0",
        currentTag: "v1.1.0",
        token: "test-token",
      },
      {
        compareCommits: compareCommitsMock,
        extractMergedPrs, // use the real pure implementation
        createOrUpdateRelease: createOrUpdateReleaseMock,
      }
    );

    expect(compareCommitsMock).toHaveBeenCalledWith(
      "kasapdev",
      "demo",
      "v1.0.0",
      "v1.1.0",
      "test-token"
    );

    expect(createOrUpdateReleaseMock).toHaveBeenCalledTimes(1);
    const [owner, repo, tag, body, token] =
      createOrUpdateReleaseMock.mock.calls[0];
    expect(owner).toBe("kasapdev");
    expect(repo).toBe("demo");
    expect(tag).toBe("v1.1.0");
    expect(token).toBe("test-token");

    expect(body).toContain("### 🚀 Features");
    expect(body).toContain("- add login (#1)");
    expect(body).toContain("### 🐛 Fixes");
    expect(body).toContain("- crash (#2)");
    expect(body).toContain(
      "**Full Changelog**: https://github.com/kasapdev/demo/compare/v1.0.0...v1.1.0"
    );

    expect(result).toEqual({
      releaseUrl: "https://github.com/kasapdev/demo/releases/tag/v1.1.0",
      prCount: 2,
    });
  });

  it("reports prCount 0 and an empty-groups body when no commits match a PR pattern", async () => {
    const compareCommitsMock = vi
      .fn()
      .mockResolvedValue([{ sha: "s1", commit: { message: "no pr here" } }]);
    const createOrUpdateReleaseMock = vi.fn().mockResolvedValue({
      id: 2,
      html_url: "https://github.com/o/r/releases/tag/v2.0.0",
    });

    const result = await runReleaseNotes(
      {
        owner: "o",
        repo: "r",
        previousTag: "v1.0.0",
        currentTag: "v2.0.0",
        token: "tok",
      },
      {
        compareCommits: compareCommitsMock,
        extractMergedPrs,
        createOrUpdateRelease: createOrUpdateReleaseMock,
      }
    );

    expect(result.prCount).toBe(0);
    const body = createOrUpdateReleaseMock.mock.calls[0][3] as string;
    expect(body).toBe(
      "**Full Changelog**: https://github.com/o/r/compare/v1.0.0...v2.0.0"
    );
  });
});
