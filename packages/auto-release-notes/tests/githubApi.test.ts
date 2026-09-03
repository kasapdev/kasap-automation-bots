import { describe, expect, it, vi } from "vitest";
import {
  compareCommits,
  createOrUpdateRelease,
  extractMergedPrs,
} from "../src/githubApi.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : String(status),
    headers: { "Content-Type": "application/json" },
  });
}

describe("compareCommits", () => {
  it("fetches the compare endpoint and returns the commits array", async () => {
    const commits = [
      { sha: "abc123", commit: { message: "feat: x (#1)" } },
      { sha: "def456", commit: { message: "fix: y (#2)" } },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ commits }));

    const result = await compareCommits(
      "owner",
      "repo",
      "v1.0.0",
      "v1.1.0",
      "test-token",
      fetchMock
    );

    expect(result).toEqual(commits);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/compare/v1.0.0...v1.1.0",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("throws when the compare request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "not found" }, 404));

    await expect(
      compareCommits("owner", "repo", "v1.0.0", "v1.1.0", "test-token", fetchMock)
    ).rejects.toThrow(/404/);
  });
});

describe("extractMergedPrs", () => {
  it("extracts PR number and title from squash-merge commit messages", () => {
    const commits = [
      { commit: { message: "feat: add login (#42)" } },
      { commit: { message: "fix: crash on startup (#43)\n\nSome body text" } },
    ];

    expect(extractMergedPrs(commits)).toEqual([
      { number: 42, title: "feat: add login" },
      { number: 43, title: "fix: crash on startup" },
    ]);
  });

  it("skips commits that don't match the squash-merge pattern", () => {
    const commits = [
      { commit: { message: "feat: add login (#42)" } },
      { commit: { message: "Manual commit with no PR reference" } },
      { commit: { message: "Merge branch 'main' into feature" } },
    ];

    expect(extractMergedPrs(commits)).toEqual([
      { number: 42, title: "feat: add login" },
    ]);
  });

  it("dedupes by PR number", () => {
    const commits = [
      { commit: { message: "feat: add login (#42)" } },
      { commit: { message: "feat: add login (#42)" } },
    ];

    expect(extractMergedPrs(commits)).toEqual([
      { number: 42, title: "feat: add login" },
    ]);
  });

  it("returns an empty array when no commits match", () => {
    const commits = [{ commit: { message: "chore: nothing to see here" } }];
    expect(extractMergedPrs(commits)).toEqual([]);
  });

  it("only considers the first line of a multi-line commit message", () => {
    const commits = [
      {
        commit: {
          message: "fix: bug (#7)\n\nLonger description (#999) mentioned here",
        },
      },
    ];

    expect(extractMergedPrs(commits)).toEqual([{ number: 7, title: "fix: bug" }]);
  });
});

describe("createOrUpdateRelease", () => {
  it("creates a new release when none exists for the tag (404 branch)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(
        jsonResponse({ id: 99, html_url: "https://github.com/o/r/releases/99" })
      );

    const result = await createOrUpdateRelease(
      "o",
      "r",
      "v1.0.0",
      "body text",
      "test-token",
      fetchMock
    );

    expect(result).toEqual({
      id: 99,
      html_url: "https://github.com/o/r/releases/99",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/o/r/releases/tags/v1.0.0",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/o/r/releases",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tag_name: "v1.0.0",
          name: "v1.0.0",
          body: "body text",
        }),
      })
    );
  });

  it("updates an existing release when one already exists for the tag (200-then-PATCH branch)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ id: 55, html_url: "https://github.com/o/r/releases/55" })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 55,
          html_url: "https://github.com/o/r/releases/55",
        })
      );

    const result = await createOrUpdateRelease(
      "o",
      "r",
      "v1.0.0",
      "updated body",
      "test-token",
      fetchMock
    );

    expect(result).toEqual({
      id: 55,
      html_url: "https://github.com/o/r/releases/55",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/o/r/releases/55",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ body: "updated body" }),
      })
    );
  });

  it("throws for a non-404, non-OK status on the initial lookup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "server error" }, 500));

    await expect(
      createOrUpdateRelease("o", "r", "v1.0.0", "body", "test-token", fetchMock)
    ).rejects.toThrow(/500/);
  });

  it("throws when the create-release POST fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ message: "bad" }, 422));

    await expect(
      createOrUpdateRelease("o", "r", "v1.0.0", "body", "test-token", fetchMock)
    ).rejects.toThrow(/422/);
  });

  it("throws when the update-release PATCH fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 1, html_url: "url" }))
      .mockResolvedValueOnce(jsonResponse({ message: "bad" }, 500));

    await expect(
      createOrUpdateRelease("o", "r", "v1.0.0", "body", "test-token", fetchMock)
    ).rejects.toThrow(/500/);
  });
});
