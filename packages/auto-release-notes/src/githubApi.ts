export interface CompareCommit {
  sha: string;
  commit: {
    message: string;
  };
}

export interface MergedPr {
  number: number;
  title: string;
}

export interface ReleaseInfo {
  id: number;
  html_url: string;
}

type FetchFn = typeof fetch;

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Fetches the list of commits between `base` and `head` via GitHub's compare API.
 */
export async function compareCommits(
  owner: string,
  repo: string,
  base: string,
  head: string,
  token: string,
  fetchImpl: FetchFn = fetch
): Promise<CompareCommit[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`;
  const response = await fetchImpl(url, { headers: githubHeaders(token) });

  if (!response.ok) {
    throw new Error(
      `GitHub compare request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { commits: CompareCommit[] };
  return data.commits;
}

/**
 * GitHub's default squash-merge commit message format is
 * `"{PR title} (#{number})"` on the first line.
 */
const SQUASH_MERGE_RE = /^(.+)\s\(#(\d+)\)$/;

/**
 * Extracts merged-PR references from a list of compare commits.
 *
 * Known limitation: this only recognizes GitHub's default squash-merge
 * commit message format (`"{title} (#{number})"` as the first line). Regular
 * (non-squash) merge commits or commits that don't follow this convention
 * are silently skipped. This works well for squash-merge workflows, which
 * is both GitHub's default and what this portfolio's own repos use.
 *
 * Results are deduped by PR number (defensively — a PR's commit could
 * theoretically appear more than once in a compare response).
 */
export function extractMergedPrs(
  commits: Array<{ commit: { message: string } }>
): MergedPr[] {
  const prsByNumber = new Map<number, MergedPr>();

  for (const { commit } of commits) {
    const firstLine = commit.message.split("\n")[0] ?? "";
    const match = SQUASH_MERGE_RE.exec(firstLine);
    if (!match) continue;

    const title = match[1] ?? "";
    const number = parseInt(match[2] ?? "", 10);
    if (Number.isNaN(number)) continue;

    prsByNumber.set(number, { number, title });
  }

  return [...prsByNumber.values()];
}

/**
 * Creates a GitHub Release for `tag` if one doesn't already exist, or
 * updates its body if it does.
 */
export async function createOrUpdateRelease(
  owner: string,
  repo: string,
  tag: string,
  body: string,
  token: string,
  fetchImpl: FetchFn = fetch
): Promise<ReleaseInfo> {
  const headers = githubHeaders(token);
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

  const existingResponse = await fetchImpl(`${baseUrl}/tags/${tag}`, {
    headers,
  });

  if (existingResponse.status === 404) {
    const createResponse = await fetchImpl(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ tag_name: tag, name: tag, body }),
    });

    if (!createResponse.ok) {
      throw new Error(
        `GitHub create-release request failed: ${createResponse.status} ${createResponse.statusText}`
      );
    }

    return (await createResponse.json()) as ReleaseInfo;
  }

  if (!existingResponse.ok) {
    throw new Error(
      `GitHub get-release-by-tag request failed: ${existingResponse.status} ${existingResponse.statusText}`
    );
  }

  const existing = (await existingResponse.json()) as ReleaseInfo;

  const updateResponse = await fetchImpl(`${baseUrl}/${existing.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ body }),
  });

  if (!updateResponse.ok) {
    throw new Error(
      `GitHub update-release request failed: ${updateResponse.status} ${updateResponse.statusText}`
    );
  }

  return (await updateResponse.json()) as ReleaseInfo;
}
