# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## Unreleased

### Fixed

- `packages/auto-release-notes`: `compareCommits` now detects when GitHub's
  compare API has silently truncated its response (the `commits` array is
  capped at 250 entries even when `total_commits` is higher) and logs a
  `console.warn` naming how many commits were actually returned. Previously
  a release spanning more than 250 commits would produce release notes
  missing an unknown number of PRs with no indication anything was wrong.

## 2026-09-06

### Tests

- `packages/ebay-price-watcher`: added two edge-case tests for `diffPrice` covering a previous price of `0` (a brand-new/never-priced listing). Verified `deltaPct` stays `null` instead of becoming `NaN`/`Infinity` when dividing by a zero previous price, both for a `0 -> 5` change and a `0 -> 0` no-op. No source change was needed — `diffPrice` already guarded this case correctly (`previous === 0 ? null : ...`), it just had no test asserting it.
