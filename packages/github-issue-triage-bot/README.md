# @kasap/github-issue-triage-bot

A GitHub Action that runs on `issues: [opened]` and:

1. **Auto-labels** the new issue by matching keywords (configurable per-repo) against
   its title and body.
2. **Flags likely duplicates** by comparing the new issue's title against every other
   open issue using Jaccard token similarity, and posts a comment listing any matches
   above a configurable threshold.

It has zero runtime npm dependencies — it uses Node 20's global `fetch` to talk to the
GitHub REST API directly instead of `@octokit/rest`, so the compiled `dist/index.js` can
run as a `node20` Action with no `node_modules` install step at run time.

## How it works

- **Labeling** — reads a JSON rules file (default `.github/issue-triage-rules.json` in
  the *consuming* repo) shaped like `label-rules.example.json` in this package:

  ```json
  {
    "rules": [
      { "label": "bug", "keywords": ["crash", "error", "exception", "broken"] },
      { "label": "documentation", "keywords": ["docs", "readme", "documentation"] },
      { "label": "question", "keywords": ["how do i", "how to", "question"] }
    ]
  }
  ```

  For each rule, if any keyword appears as a case-insensitive substring anywhere in the
  issue's title + body, that rule's label is applied. All matching labels from all rules
  are applied in a single call.

- **Duplicate detection** — tokenizes issue titles (lowercase, punctuation stripped,
  stopwords removed), computes Jaccard similarity (`|intersection| / |union|` of token
  sets) between the new issue's title and every other open issue's title, and flags any
  issue scoring at or above `similarity-threshold`. If one or more are found, it posts a
  comment on the new issue like:

  ```
  This issue looks similar to 2 existing open issue(s):

  - #123: App crashes on startup (similarity: 0.82)
  - #97: Crash when starting the app (similarity: 0.71)
  ```

## Usage

Add a workflow to the consuming repo, e.g. `.github/workflows/issue-triage.yml`:

```yaml
name: Issue Triage

on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: kasapdev/kasap-automation-bots/packages/github-issue-triage-bot@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          label-rules-path: ".github/issue-triage-rules.json"
          similarity-threshold: "0.6"
```

Then add `.github/issue-triage-rules.json` to the consuming repo (copy
`label-rules.example.json` from this package as a starting point).

### Inputs

| Input                   | Required | Default                              | Description                                                             |
| ------------------------ | -------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `github-token`            | yes      | —                                     | Token with `issues:write` permission (usually `secrets.GITHUB_TOKEN`).   |
| `label-rules-path`         | no       | `.github/issue-triage-rules.json`      | Path (relative to the consuming repo) to the label-rules JSON config.    |
| `similarity-threshold`     | no       | `0.6`                                  | Jaccard similarity (0-1) above which an open issue is flagged as a likely duplicate. |

## Known limitation: `dist/` is not committed here

This monorepo's root `.gitignore` ignores `dist/` for every package (it's treated as
build output, not source). That's the right default for libraries, but a GitHub Action
referenced via `uses: owner/repo/path@ref` needs its compiled `dist/index.js` to actually
exist at that ref — Actions on `runs: using: node20` do not run an install/build step for
you.

This is a deliberate, documented gap in this portfolio setup rather than an oversight.
Until a release workflow is added, treat it as a TODO and pick one of:

- **(a) Reference a released tag** once a release workflow (out of scope for this
  package) builds and commits/attaches `dist/` to a tag, and point `uses:` at that tag
  instead of `@master`.
- **(b) Build and commit `dist/` yourself** if you fork/vendor this package: run
  `pnpm --filter @kasap/github-issue-triage-bot build`, then explicitly
  `git add -f packages/github-issue-triage-bot/dist` and commit it (the `-f` is required
  because the root `.gitignore` ignores `dist/`).

## Development

```bash
pnpm --filter @kasap/github-issue-triage-bot typecheck
pnpm --filter @kasap/github-issue-triage-bot test
pnpm --filter @kasap/github-issue-triage-bot build
```

See `.env.example` for the environment variable used when manually exercising the
GitHub API wrapper (`src/githubApi.ts`) or `src/run.ts` against a real repo locally —
the Action itself gets its inputs from the GitHub Actions runtime (`INPUT_*` env vars,
`GITHUB_REPOSITORY`, `GITHUB_EVENT_PATH`), not from a `.env` file.

## Tests

All tests are unit/integration tests with the GitHub REST API mocked via
`vi.stubGlobal("fetch", ...)` or injected `fetchImpl`/`deps` overrides — no test ever
makes a real network call to `api.github.com`.
