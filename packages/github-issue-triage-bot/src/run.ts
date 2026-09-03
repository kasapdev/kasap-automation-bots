import { loadLabelRules, matchLabels } from "./labelRules.js";
import { findLikelyDuplicates, type DuplicateCandidate } from "./duplicates.js";
import { listOpenIssues, addLabels, postComment } from "./githubApi.js";

export interface RunTriageInput {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  token: string;
  labelRulesPath: string;
  similarityThreshold: number;
}

/**
 * Optional dependency overrides, primarily for tests. Anything omitted
 * falls back to the real implementation.
 */
export interface RunTriageDeps {
  loadLabelRules?: typeof loadLabelRules;
  matchLabels?: typeof matchLabels;
  listOpenIssues?: typeof listOpenIssues;
  addLabels?: typeof addLabels;
  postComment?: typeof postComment;
  findLikelyDuplicates?: typeof findLikelyDuplicates;
}

export interface RunTriageSummary {
  labelsApplied: string[];
  duplicates: DuplicateCandidate[];
}

function buildDuplicateCommentBody(duplicates: DuplicateCandidate[]): string {
  const lines = duplicates.map(
    (dup) => `- #${dup.number}: ${dup.title} (similarity: ${dup.score.toFixed(2)})`,
  );
  return [
    `This issue looks similar to ${duplicates.length} existing open issue(s):`,
    "",
    ...lines,
  ].join("\n");
}

/**
 * Orchestrates label matching + duplicate detection for a single newly
 * opened issue: loads rules, applies matching labels, then checks open
 * issues for likely duplicates and posts a comment if any are found.
 */
export async function runTriage(
  input: RunTriageInput,
  deps: RunTriageDeps = {},
): Promise<RunTriageSummary> {
  const doLoadLabelRules = deps.loadLabelRules ?? loadLabelRules;
  const doMatchLabels = deps.matchLabels ?? matchLabels;
  const doListOpenIssues = deps.listOpenIssues ?? listOpenIssues;
  const doAddLabels = deps.addLabels ?? addLabels;
  const doPostComment = deps.postComment ?? postComment;
  const doFindLikelyDuplicates = deps.findLikelyDuplicates ?? findLikelyDuplicates;

  const rules = doLoadLabelRules(input.labelRulesPath);
  const labelsApplied = doMatchLabels(input.issueTitle, input.issueBody, rules);

  if (labelsApplied.length > 0) {
    await doAddLabels(input.owner, input.repo, input.issueNumber, labelsApplied, input.token);
  }

  const openIssues = await doListOpenIssues(input.owner, input.repo, input.token);
  const duplicates = doFindLikelyDuplicates(input.issueTitle, openIssues, input.similarityThreshold);

  if (duplicates.length > 0) {
    const body = buildDuplicateCommentBody(duplicates);
    await doPostComment(input.owner, input.repo, input.issueNumber, body, input.token);
  }

  return { labelsApplied, duplicates };
}
