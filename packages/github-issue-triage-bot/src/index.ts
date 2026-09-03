import { readFileSync } from "node:fs";
import { runTriage } from "./run.js";

interface IssueEventPayload {
  issue: {
    number: number;
    title: string;
    body: string | null;
  };
}

function getInput(name: string, fallback?: string): string {
  // GitHub Actions passes inputs as INPUT_<NAME_UPPERCASED_WITH_HYPHENS_KEPT>,
  // e.g. input "label-rules-path" -> env var "INPUT_LABEL-RULES-PATH".
  const envName = `INPUT_${name.toUpperCase()}`;
  const value = process.env[envName];
  if (value !== undefined && value !== "") {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required input: ${name} (expected env var ${envName})`);
}

function resolveToken(): string {
  // GITHUB_TOKEN is the simplest, most common source. Fall back to the
  // Action-style INPUT_GITHUB-TOKEN if it's not set.
  const plain = process.env.GITHUB_TOKEN;
  if (plain) {
    return plain;
  }
  const fromInput = process.env["INPUT_GITHUB-TOKEN"];
  if (fromInput) {
    return fromInput;
  }
  throw new Error("Missing GitHub token: set GITHUB_TOKEN or the github-token action input");
}

function parseRepository(repository: string): { owner: string; repo: string } {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY must be in "owner/repo" form, got: ${repository}`);
  }
  return { owner, repo };
}

export async function main(): Promise<void> {
  const token = resolveToken();

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error("Missing required env var: GITHUB_REPOSITORY");
  }
  const { owner, repo } = parseRepository(repository);

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("Missing required env var: GITHUB_EVENT_PATH");
  }
  const event = JSON.parse(readFileSync(eventPath, "utf-8")) as IssueEventPayload;

  const labelRulesPath = getInput("label-rules-path", ".github/issue-triage-rules.json");
  const similarityThreshold = Number.parseFloat(getInput("similarity-threshold", "0.6"));

  const summary = await runTriage({
    owner,
    repo,
    issueNumber: event.issue.number,
    issueTitle: event.issue.title,
    issueBody: event.issue.body ?? "",
    token,
    labelRulesPath,
    similarityThreshold,
  });

  console.log(
    `Triage complete for ${owner}/${repo}#${event.issue.number}: ` +
      `applied [${summary.labelsApplied.join(", ")}], ` +
      `found ${summary.duplicates.length} likely duplicate(s).`,
  );
}

// Only run the action logic when actually invoked as a GitHub Action
// (GITHUB_EVENT_PATH is always set by the Actions runtime). This keeps
// `import` of this module in tests side-effect free.
if (process.env.GITHUB_EVENT_PATH) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
