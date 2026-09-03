import { describe, expect, it } from "vitest";
import { findLikelyDuplicates } from "../src/duplicates.js";
import { jaccardSimilarity } from "../src/similarity.js";

describe("findLikelyDuplicates", () => {
  it("returns no duplicates when all scores are below the threshold", () => {
    const result = findLikelyDuplicates(
      "App crashes on startup",
      [
        { number: 1, title: "Add dark mode support" },
        { number: 2, title: "Improve onboarding flow" },
      ],
      0.6,
    );
    expect(result).toEqual([]);
  });

  it("finds several duplicates above the threshold, sorted descending by score", () => {
    const newTitle = "App crashes on startup after update";
    const candidates = [
      { number: 1, title: "App crashes on startup during update" }, // high overlap
      { number: 2, title: "App crashes right after the update" }, // some overlap
      { number: 3, title: "Completely unrelated feature request" }, // no overlap
    ];

    const scoreOf = (title: string) => jaccardSimilarity(newTitle, title);
    const score1 = scoreOf(candidates[0]!.title);
    const score2 = scoreOf(candidates[1]!.title);

    const result = findLikelyDuplicates(newTitle, candidates, 0.1);

    expect(result.map((r) => r.number)).toEqual([1, 2]);
    expect(result[0]!.score).toBeCloseTo(score1, 10);
    expect(result[1]!.score).toBeCloseTo(score2, 10);
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
  });

  it("includes a candidate exactly at the threshold boundary (score >= threshold)", () => {
    const newTitle = "crash startup update";
    const candidateTitle = "crash startup login"; // intersection 2, union 4 -> 0.5
    const threshold = jaccardSimilarity(newTitle, candidateTitle);
    expect(threshold).toBeCloseTo(0.5, 10);

    const result = findLikelyDuplicates(
      newTitle,
      [{ number: 42, title: candidateTitle }],
      threshold,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ number: 42, title: candidateTitle, score: threshold });
  });

  it("excludes candidates just below the threshold boundary", () => {
    const newTitle = "crash startup update";
    const candidateTitle = "crash startup login";
    const threshold = jaccardSimilarity(newTitle, candidateTitle);

    const result = findLikelyDuplicates(
      newTitle,
      [{ number: 42, title: candidateTitle }],
      threshold + 0.001,
    );

    expect(result).toEqual([]);
  });

  it("defensively excludes a candidate whose title is byte-identical to the new title", () => {
    const newTitle = "App crashes on startup";
    const result = findLikelyDuplicates(
      newTitle,
      [
        { number: 1, title: newTitle },
        { number: 2, title: "App crashes at startup" },
      ],
      0.1,
    );

    expect(result.some((r) => r.number === 1)).toBe(false);
  });

  it("returns an empty array when there are no candidate issues", () => {
    expect(findLikelyDuplicates("Anything", [], 0.5)).toEqual([]);
  });
});
