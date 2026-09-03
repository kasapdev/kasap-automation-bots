import { jaccardSimilarity } from "./similarity.js";

export interface DuplicateCandidate {
  number: number;
  title: string;
  score: number;
}

/**
 * Pure function: computes Jaccard title similarity between `newTitle` and
 * every candidate in `openIssues`, filters to `score >= threshold`, sorts
 * descending by score, and defensively excludes any candidate whose title
 * is byte-identical to `newTitle` (self-match).
 */
export function findLikelyDuplicates(
  newTitle: string,
  openIssues: Array<{ number: number; title: string }>,
  threshold: number,
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const issue of openIssues) {
    if (issue.title === newTitle) {
      continue;
    }

    const score = jaccardSimilarity(newTitle, issue.title);
    if (score >= threshold) {
      candidates.push({ number: issue.number, title: issue.title, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}
