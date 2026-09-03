import { describe, expect, it } from "vitest";
import { jaccardSimilarity, tokenize } from "../src/similarity.js";

describe("tokenize", () => {
  it("lowercases and splits on whitespace", () => {
    expect(tokenize("Hello World")).toEqual(["hello", "world"]);
  });

  it("strips punctuation", () => {
    expect(tokenize("Crash! On startup: help, please.")).toEqual([
      "crash",
      "startup",
      "help",
      "please",
    ]);
  });

  it("filters out stopwords", () => {
    expect(tokenize("This is a bug in the app")).toEqual(["bug", "app"]);
  });

  it("filters out empty tokens from repeated whitespace", () => {
    expect(tokenize("bug    in    app")).toEqual(["bug", "app"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("returns an empty array for a string of only stopwords and punctuation", () => {
    expect(tokenize("the a is, of.")).toEqual([]);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaccardSimilarity("App crashes on startup", "App crashes on startup")).toBe(1);
  });

  it("returns 1 for strings identical up to case and punctuation", () => {
    expect(jaccardSimilarity("App Crashes!", "app crashes")).toBe(1);
  });

  it("returns 0 for completely disjoint strings", () => {
    expect(jaccardSimilarity("apple banana cherry", "dog elephant fox")).toBe(0);
  });

  it("computes the exact expected fraction for partial overlap", () => {
    // a tokens (after stopword removal, "on" is a stopword): [crash, startup, after, update]
    // b tokens: [crash, startup, during, login]
    // intersection: {crash, startup} = 2
    // union: {crash, startup, after, update, during, login} = 6
    // expected = 2/6 = 1/3
    const a = "Crash on startup after update";
    const b = "Crash on startup during login";
    expect(tokenize(a)).toEqual(["crash", "startup", "after", "update"]);
    expect(tokenize(b)).toEqual(["crash", "startup", "during", "login"]);
    expect(jaccardSimilarity(a, b)).toBeCloseTo(2 / 6, 10);
  });

  it("handles empty strings without NaN or throwing", () => {
    expect(jaccardSimilarity("", "")).toBe(0);
    expect(() => jaccardSimilarity("", "")).not.toThrow();
    expect(Number.isNaN(jaccardSimilarity("", ""))).toBe(false);
  });

  it("returns 0 when one side is empty and the other is not", () => {
    expect(jaccardSimilarity("", "some real content")).toBe(0);
    expect(jaccardSimilarity("some real content", "")).toBe(0);
  });

  it("returns 0 when both strings contain only stopwords (empty token sets)", () => {
    expect(jaccardSimilarity("the a is", "of and to")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(jaccardSimilarity("BUG IN LOGIN FLOW", "bug in login flow")).toBe(1);
  });

  it("ignores punctuation differences", () => {
    expect(jaccardSimilarity("Bug: login flow broken!", "Bug login flow broken")).toBe(1);
  });
});
