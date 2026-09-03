/**
 * Parsed representation of a PR title, following the Conventional Commits
 * convention: `type(scope)!: subject`.
 */
export interface ParsedPrefix {
  type: string;
  scope: string | null;
  breaking: boolean;
  subject: string;
}

/**
 * Matches `type(scope)!: subject`, where `(scope)` and `!` are both optional.
 *
 * `\w+` deliberately excludes spaces, so a title like "Update README: fix typo"
 * does NOT match this regex (the would-be "type" token "Update README" contains
 * a space) and falls through to the "other" bucket below — this is intentional,
 * not a bug: conventional-commit types are always a single word.
 */
const CONVENTIONAL_PREFIX_RE = /^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/;

/**
 * Parses a PR title for a Conventional-Commits-style prefix.
 *
 * Titles that don't match the conventional pattern (no recognizable
 * `type: subject` prefix, e.g. free-form titles or titles with a colon
 * inside a longer phrase that isn't a single-word type) fall back to
 * `{ type: "other", scope: null, breaking: false, subject: prTitle }`,
 * using the entire original title as the subject. This function never
 * throws — it always returns a value for any input string.
 */
export function parseConventionalPrefix(prTitle: string): ParsedPrefix {
  const match = CONVENTIONAL_PREFIX_RE.exec(prTitle);
  if (!match) {
    return { type: "other", scope: null, breaking: false, subject: prTitle };
  }

  const [, type, , scope, breakingMarker, subject] = match;

  return {
    type: (type ?? "").toLowerCase(),
    scope: scope ?? null,
    breaking: breakingMarker === "!",
    subject: subject ?? prTitle,
  };
}
