import {
  compareCommits,
  extractMergedPrs,
  createOrUpdateRelease,
  type CompareCommit,
  type ReleaseInfo,
} from "./githubApi.js";
import { groupPrsByType } from "./groupByType.js";
import { formatReleaseNotes } from "./formatReleaseNotes.js";

export interface RunReleaseNotesInput {
  owner: string;
  repo: string;
  previousTag: string;
  currentTag: string;
  token: string;
}

export interface RunReleaseNotesDeps {
  compareCommits: typeof compareCommits;
  extractMergedPrs: typeof extractMergedPrs;
  createOrUpdateRelease: typeof createOrUpdateRelease;
}

export interface RunReleaseNotesResult {
  releaseUrl: string;
  prCount: number;
}

const defaultDeps: RunReleaseNotesDeps = {
  compareCommits,
  extractMergedPrs,
  createOrUpdateRelease,
};

/**
 * Orchestrates the full release-notes pipeline: fetch commits between two
 * tags, extract merged PRs from them, group by Conventional-Commit type,
 * render a Markdown release body, and create/update the GitHub Release.
 */
export async function runReleaseNotes(
  input: RunReleaseNotesInput,
  deps: RunReleaseNotesDeps = defaultDeps
): Promise<RunReleaseNotesResult> {
  const { owner, repo, previousTag, currentTag, token } = input;

  const commits: CompareCommit[] = await deps.compareCommits(
    owner,
    repo,
    previousTag,
    currentTag,
    token
  );

  const prs = deps.extractMergedPrs(commits);
  const grouped = groupPrsByType(prs);
  const compareUrl = `https://github.com/${owner}/${repo}/compare/${previousTag}...${currentTag}`;
  const body = formatReleaseNotes(grouped, { compareUrl });

  const release: ReleaseInfo = await deps.createOrUpdateRelease(
    owner,
    repo,
    currentTag,
    body,
    token
  );

  return { releaseUrl: release.html_url, prCount: prs.length };
}
