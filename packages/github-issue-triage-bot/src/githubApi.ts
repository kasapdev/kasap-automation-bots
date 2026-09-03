/**
 * Thin wrapper around the GitHub REST API. Every function takes its
 * dependencies (owner/repo/token, and an injectable fetch implementation) as
 * parameters so it stays testable without hitting api.github.com.
 */

export interface OpenIssue {
  number: number;
  title: string;
}

type FetchLike = typeof fetch;

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

async function assertOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub API error while ${action}: ${response.status} ${response.statusText} ${body}`.trim());
  }
}

/**
 * Lists open issues for a repo. The GitHub "issues" endpoint also returns
 * pull requests, so entries carrying a `pull_request` key are filtered out.
 */
export async function listOpenIssues(
  owner: string,
  repo: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<OpenIssue[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: githubHeaders(token),
  });

  await assertOk(response, `listing open issues for ${owner}/${repo}`);

  const data = (await response.json()) as Array<{
    number: number;
    title: string;
    pull_request?: unknown;
  }>;

  return data
    .filter((item) => item.pull_request === undefined)
    .map((item) => ({ number: item.number, title: item.title }));
}

/** Adds one or more labels to an issue. */
export async function addLabels(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[],
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ labels }),
  });

  await assertOk(response, `adding labels to issue #${issueNumber} in ${owner}/${repo}`);
}

/** Posts a comment on an issue. */
export async function postComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  await assertOk(response, `posting comment on issue #${issueNumber} in ${owner}/${repo}`);
}
