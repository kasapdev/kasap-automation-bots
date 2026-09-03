import { describe, expect, it } from "vitest";
import { parseConventionalPrefix } from "../src/parsePrefix.js";

describe("parseConventionalPrefix", () => {
  it("parses a plain type: subject title", () => {
    expect(parseConventionalPrefix("feat: x")).toEqual({
      type: "feat",
      scope: null,
      breaking: false,
      subject: "x",
    });
  });

  it("parses a title with a scope", () => {
    expect(parseConventionalPrefix("feat(auth): add login")).toEqual({
      type: "feat",
      scope: "auth",
      breaking: false,
      subject: "add login",
    });
  });

  it("parses a fix without a scope", () => {
    expect(parseConventionalPrefix("fix: crash on startup")).toEqual({
      type: "fix",
      scope: null,
      breaking: false,
      subject: "crash on startup",
    });
  });

  it("parses a breaking-change marker without a scope", () => {
    expect(parseConventionalPrefix("feat!: breaking change")).toEqual({
      type: "feat",
      scope: null,
      breaking: true,
      subject: "breaking change",
    });
  });

  it("parses a breaking-change marker with a scope", () => {
    expect(parseConventionalPrefix("feat(api)!: remove old endpoint")).toEqual(
      {
        type: "feat",
        scope: "api",
        breaking: true,
        subject: "remove old endpoint",
      }
    );
  });

  it("falls back to 'other' for a title with no colon at all", () => {
    expect(parseConventionalPrefix("Bump dependencies")).toEqual({
      type: "other",
      scope: null,
      breaking: false,
      subject: "Bump dependencies",
    });
  });

  it("falls back to 'other' when the type token contains a space", () => {
    // "Update README" (before the colon) is not a single \w+ token — it
    // contains a space — so the conventional-prefix regex does not match
    // syntactically, and the whole title is used as the subject verbatim.
    const result = parseConventionalPrefix("Update README: fix typo");
    expect(result).toEqual({
      type: "other",
      scope: null,
      breaking: false,
      subject: "Update README: fix typo",
    });
  });

  it("lowercases the parsed type", () => {
    expect(parseConventionalPrefix("Feat: uppercase type").type).toBe("feat");
  });

  it("handles chore(deps) bump-style titles", () => {
    expect(parseConventionalPrefix("chore(deps): bump foo")).toEqual({
      type: "chore",
      scope: "deps",
      breaking: false,
      subject: "bump foo",
    });
  });

  it("treats an unrecognized-but-syntactically-valid type as its own type, not 'other'", () => {
    // "banana" is not a real Conventional Commit type, but it still matches
    // the regex shape (\w+: subject), so it's returned as-is rather than
    // being coerced to "other". Grouping/labeling decisions live elsewhere.
    expect(parseConventionalPrefix("banana: not a real type")).toEqual({
      type: "banana",
      scope: null,
      breaking: false,
      subject: "not a real type",
    });
  });

  it("preserves a colon that appears inside the subject", () => {
    expect(parseConventionalPrefix("fix: handle edge case: empty input")).toEqual(
      {
        type: "fix",
        scope: null,
        breaking: false,
        subject: "handle edge case: empty input",
      }
    );
  });

  it("handles an empty string without throwing", () => {
    expect(parseConventionalPrefix("")).toEqual({
      type: "other",
      scope: null,
      breaking: false,
      subject: "",
    });
  });

  it("consumes all whitespace immediately after the colon, preserving internal spacing", () => {
    expect(parseConventionalPrefix("feat:   extra   spaces").subject).toBe(
      "extra   spaces"
    );
  });
});
