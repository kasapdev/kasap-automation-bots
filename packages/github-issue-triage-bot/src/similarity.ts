/**
 * Pure string-similarity utilities used to detect likely-duplicate issues.
 * No I/O, no side effects — easy to unit test exhaustively.
 */

/** Small English stopword list. Kept intentionally short and simple. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "at",
  "for",
  "with",
  "it",
  "this",
  "that",
  "be",
  "as",
  "by",
]);

/**
 * Lowercases, strips punctuation, splits on whitespace, and filters out
 * empty tokens and common English stopwords.
 */
export function tokenize(text: string): string[] {
  const lowered = text.toLowerCase();
  // Replace anything that isn't a letter, digit, or whitespace with a space.
  const stripped = lowered.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = stripped.split(/\s+/).filter((token) => token.length > 0);
  return tokens.filter((token) => !STOPWORDS.has(token));
}

/**
 * Jaccard similarity between the token sets of two strings:
 * |intersection| / |union|. Returns 0 when both token sets are empty
 * (rather than NaN).
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  if (unionSize === 0) {
    return 0;
  }

  return intersectionSize / unionSize;
}
