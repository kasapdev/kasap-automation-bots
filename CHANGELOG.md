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

## 2026-09-08

### Added

- `packages/ebay-price-watcher` (`0.1.0` -> `0.2.0`): added real multi-currency
  normalization. Watched items are no longer diffed as raw numbers across
  currencies - every fetched price is converted into a configurable
  `BASE_CURRENCY` (default `USD`) via a new `currency.ts` module
  (`fetchExchangeRate`/`convertPrice`) before it's stored or compared.
  `fetchExchangeRate` calls the free Frankfurter API (ECB rates, no API key),
  short-circuits to a rate of `1` with no network call when the currencies
  already match, and caches fetched rates in memory for an hour. `pollOnce`
  now diffs/stores each item's base-currency price alongside its raw listing
  price, discards a stored base-currency price if `BASE_CURRENCY` changed (or
  is missing, e.g. an older state file) since the last run rather than
  comparing across currencies, and a new `sumBaseCurrencyValue` helper totals
  the whole watched portfolio in one currency (logged by `index.ts` after
  every check). The Discord drop embed now shows the original listing price
  alongside the base-currency comparison when they differ. See the package
  README's "Multi-Currency Normalization" section for a runnable example.

### Fixed

- `packages/ebay-price-watcher`: `readState` threw a raw, unhelpful
  `SyntaxError` when the local price-state JSON file was corrupted, unlike
  every other file-parsing path in the package (`config.ts`'s items-file
  loader already wrapped its `JSON.parse` in a clear, actionable error).
  Fixed to match that convention.

### Tests

- `packages/ebay-price-watcher`: added `currency.test.ts` (rate fetching,
  same-currency short-circuit, caching/TTL, error handling) and
  `poll.test.ts` (cross-currency diffing, base-currency-change and
  missing-`lastPriceBase` edge cases, per-item error handling,
  `sumBaseCurrencyValue`) covering the new feature, plus `config.test.ts` for
  `BASE_CURRENCY` parsing/validation. Added edge-case tests to
  `discordNotify.test.ts` (original-price line shown/omitted) and
  `state.test.ts` (new fields round-trip; the corrupted-JSON fix above).

## 2026-09-06

### Tests

- `packages/ebay-price-watcher`: added two edge-case tests for `diffPrice` covering a previous price of `0` (a brand-new/never-priced listing). Verified `deltaPct` stays `null` instead of becoming `NaN`/`Infinity` when dividing by a zero previous price, both for a `0 -> 5` change and a `0 -> 0` no-op. No source change was needed — `diffPrice` already guarded this case correctly (`previous === 0 ? null : ...`), it just had no test asserting it.
