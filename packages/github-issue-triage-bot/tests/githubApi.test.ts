import { describe, expect, it, vi } from "vitest";
import { addLabels, listOpenIssues, postComment } from "../src/githubApi.js";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  return {
    ok,
    status,
    statusText: init.statusText ?? (ok ? "OK" : "Error"),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("listOpenIssues", () => {
  it("calls the correct URL, method, and headers, and returns parsed issues", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse([
        { number: 1, title: "First issue" },
        { number: 2, title: "PR disguised as issue", pull_request: { url: "..." } },
        { number: 3, title: "Second issue" },
      ]),
    );

    const result = await listOpenIssues("kasapdev", "demo-repo", "tok_123", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/kasapdev/demo-repo/issues?state=open&per_page=100");
    expect(options.method).toBe("GET");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer tok_123",
      Accept: "application/vnd.github+json",
    });

    expect(result).toEqual([
      { number: 1, title: "First issue" },
      { number: 3, title: "Second issue" },
    ]);
  });

  it("throws a clear error including the status code on a non-OK response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Bad credentials" }, { ok: false, status: 401, statusText: "Unauthorized" }));

    await expect(listOpenIssues("kasapdev", "demo-repo", "bad-tok", fetchImpl)).rejects.toThrow(/401/);
  });
});

describe("addLabels", () => {
  it("posts the labels array to the correct URL with the correct headers and body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));

    await addLabels("kasapdev", "demo-repo", 7, ["bug", "question"], "tok_123", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/kasapdev/demo-repo/issues/7/labels");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer tok_123",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body)).toEqual({ labels: ["bug", "question"] });
  });

  it("throws a clear error including the status code on a non-OK response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404, statusText: "Not Found" }));

    await expect(addLabels("kasapdev", "demo-repo", 7, ["bug"], "tok_123", fetchImpl)).rejects.toThrow(/404/);
  });
});

describe("postComment", () => {
  it("posts the comment body to the correct URL with the correct headers and body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));

    await postComment("kasapdev", "demo-repo", 7, "Possible duplicate: #3", "tok_123", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/kasapdev/demo-repo/issues/7/comments");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer tok_123",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body)).toEqual({ body: "Possible duplicate: #3" });
  });

  it("throws a clear error including the status code on a non-OK response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500, statusText: "Server Error" }));

    await expect(
      postComment("kasapdev", "demo-repo", 7, "hello", "tok_123", fetchImpl),
    ).rejects.toThrow(/500/);
  });
});
