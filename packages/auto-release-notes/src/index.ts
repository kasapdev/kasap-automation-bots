import { pathToFileURL } from "node:url";
import { runReleaseNotes } from "./run.js";

/**
 * Reads the GitHub Actions inputs/env vars for this Action and runs the
 * release-notes pipeline. Exported (rather than only run as a side effect)
 * so it can be exercised from tests without a real process environment.
 */
export async function main(): Promise<void> {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required.");
  }

  const repository = process.env["GITHUB_REPOSITORY"];
  if (!repository || !repository.includes("/")) {
    throw new Error(
      'GITHUB_REPOSITORY environment variable is required, in "owner/repo" form.'
    );
  }
  const [owner, repo] = repository.split("/") as [string, string];

  // Actions inputs are exposed as env vars named INPUT_<NAME-UPPERCASED>.
  const currentTag =
    process.env["INPUT_CURRENT-TAG"] || process.env["GITHUB_REF_NAME"];
  if (!currentTag) {
    throw new Error(
      'The "current-tag" input is required (or run this Action on a tag push, ' +
        "so GITHUB_REF_NAME can be used as a fallback)."
    );
  }

  // Known limitation: this Action does not compute the previous tag itself.
  // Determining "the previous release tag" requires either git tag history
  // (not available via the REST API alone with just a token) or a
  // repo-specific convention. Callers should compute it in the consumer
  // workflow YAML, e.g. via `git describe --tags --abbrev=0 HEAD^`, and pass
  // it explicitly as the "previous-tag" input.
  const previousTag = process.env["INPUT_PREVIOUS-TAG"];
  if (!previousTag) {
    throw new Error(
      'The "previous-tag" input is required. Compute it in your workflow (e.g. ' +
        "`git describe --tags --abbrev=0 HEAD^`) and pass it explicitly — this " +
        "Action cannot derive it from the REST API alone."
    );
  }

  const result = await runReleaseNotes({
    owner,
    repo,
    previousTag,
    currentTag,
    token,
  });

  console.log(
    `Release notes published for ${owner}/${repo}@${currentTag}: ${result.releaseUrl} (${result.prCount} PR(s))`
  );
}

// Only run when actually invoked as the entrypoint (e.g. by the GitHub
// Actions runner executing dist/index.js directly) — not when imported,
// such as from tests.
const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
