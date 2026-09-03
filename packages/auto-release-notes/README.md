# @kasap/auto-release-notes

A GitHub Action that builds a grouped, Markdown release body from the merged
pull requests between two tags, and creates or updates the matching GitHub
Release.

## What it does

1. Fetches the commits between `previous-tag` and `current-tag` via the
   GitHub compare API.
2. Extracts merged-PR references from those commits (see
   [Squash-merge only](#squash-merge-only) below).
3. Groups the PRs by their [Conventional Commits](https://www.conventionalcommits.org/)
   type prefix, parsed from the PR title (`feat: ...`, `fix(scope): ...`,
   `feat!: ...`, etc.). Titles that don't match the convention are bucketed
   under "Other Changes".
4. Renders a Markdown release body with one section per type present
   (`### 🚀 Features`, `### 🐛 Fixes`, `### 📚 Docs`, `### ♻️ Refactors`,
   `### ⚡ Performance`, `### ✅ Tests`, `### 🧹 Chores`, `### 📦 Other Changes`),
   each PR as a bullet (`- {subject} (#{number})`, prefixed with `⚠️ ` for
   breaking changes), followed by a compare-link footer.
5. Creates the GitHub Release for `current-tag` if it doesn't exist yet, or
   updates its body if it does.

## Usage

```yaml
name: Release notes

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  release-notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # full history, needed to compute the previous tag

      - name: Determine previous tag
        id: prev
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 "${GITHUB_REF_NAME}^" 2>/dev/null || echo "")
          echo "tag=$PREV_TAG" >> "$GITHUB_OUTPUT"

      - name: Generate release notes
        uses: kasapdev/kasap-automation-bots/packages/auto-release-notes@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          current-tag: ${{ github.ref_name }}
          previous-tag: ${{ steps.prev.outputs.tag }}
```

### Inputs

| Input          | Required | Description                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------------- |
| `github-token` | Yes      | Token with `contents:write` permission (usually `secrets.GITHUB_TOKEN`).      |
| `current-tag`  | No       | The tag being released. Defaults to `GITHUB_REF_NAME` if it's a tag push.     |
| `previous-tag` | Yes      | The previous release tag to compare against.                                  |

## Known limitations

### Computing `previous-tag`

This Action does **not** compute `previous-tag` for you. Determining "the
previous release tag" requires git tag history, which isn't available
through the REST API alone with just a token — only through the checked-out
git repository in the workflow runner. Compute it yourself in the consumer
workflow YAML (e.g. via `git describe --tags --abbrev=0 HEAD^`, as shown
above) and pass it explicitly as the `previous-tag` input.

### Squash-merge only

PR extraction relies on GitHub's default **squash-merge** commit message
format — `"{PR title} (#{number})"` as the first line of the commit message.
This works well for squash-merge workflows, which is both GitHub's default
merge strategy and what this portfolio's own repos use. Commits from a
regular merge or rebase-merge workflow won't match this pattern and are
silently skipped (no PR reference is extracted from them).

### `dist/` must be committed

Like the sibling `github-issue-triage-bot` package (and every Action package
in this repo), consumers reference this Action via a path within this
monorepo:

```yaml
uses: kasapdev/kasap-automation-bots/packages/auto-release-notes@master
```

GitHub Actions runs the compiled JavaScript in `dist/index.js` directly —
it does not run a build step for you. However, the **root `.gitignore` in
this repo ignores `dist/`** (build output is normally not committed in a
TypeScript monorepo). This is a known, accepted limitation of this
portfolio's setup: for this Action to actually work when referenced by tag
or branch from another repo, `packages/auto-release-notes/dist/` would need
to be force-added and committed (bypassing the root ignore rule) as part of
a release process. Until that's set up, treat this package as a
source-available reference implementation rather than a drop-in dependency.

## Local development

```bash
pnpm install
pnpm --filter @kasap/auto-release-notes test
pnpm --filter @kasap/auto-release-notes build
```

Copy `.env.example` to `.env` for local experimentation with a real GitHub
token (never commit a real token). `current-tag` and `previous-tag` are
Action *inputs* supplied by the consumer workflow YAML — they have no `.env`
equivalent.
