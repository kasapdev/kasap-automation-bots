# Kasap Automation Bots

[![CI](https://github.com/kasapdev/kasap-automation-bots/actions/workflows/ci.yml/badge.svg)](https://github.com/kasapdev/kasap-automation-bots/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A portfolio of small, genuinely working automation bots and GitHub Actions built by
[kasapdev](https://github.com/kasapdev) for running a hosting company (Berilis), a
logistics startup (Sadakat Logistics), and selling on eBay. Each package is
independent, installable on its own, and does one job well: no shared runtime
framework, light duplication between packages where it keeps things simple.

Monorepo managed with pnpm workspaces. TypeScript + ESM throughout, `vitest` for unit
tests (all external network/Discord calls mocked in tests - nothing here makes a real
network call in CI).

## Structure

```
packages/
  ebay-price-watcher/          eBay price-drop watcher -> Discord webhook
  server-uptime-bot/           TCP host/port + local resource checks -> Discord webhook
  domain-expiry-notifier/      WHOIS + TLS cert expiry checks -> console / Discord webhook
  github-issue-triage-bot/     GitHub Action: auto-label + duplicate-issue detection
  auto-release-notes/          GitHub Action: grouped release notes from merged PRs
  discord-ticket-bot/          discord.js support-ticket system
  discord-role-shop/           discord.js point economy + role shop (SQLite backed)
  discord-uptime-status-embed/ discord.js live status embed (edits one pinned message)
```

## Bots

- **[ebay-price-watcher](packages/ebay-price-watcher)** - polls eBay listings via the
  Browse API and posts a Turkish Discord notification when the price drops.
- **[server-uptime-bot](packages/server-uptime-bot)** - TCP-checks a list of
  hosts/ports plus local system stats, posts a Turkish status embed to Discord.
- **[domain-expiry-notifier](packages/domain-expiry-notifier)** - WHOIS + TLS cert
  expiry checks for domains, warns before they lapse.
- **[discord-ticket-bot](packages/discord-ticket-bot)** - slash-command support-ticket
  system with per-user channels and a close button, Turkish prompts.
- **[discord-role-shop](packages/discord-role-shop)** - message-activity point economy
  backed by SQLite, `/shop` and `/buy` commands to purchase Discord roles.
- **[discord-uptime-status-embed](packages/discord-uptime-status-embed)** - keeps a
  single pinned Discord message live-updated with per-server up/down status.

## GitHub Actions

- **[github-issue-triage-bot](packages/github-issue-triage-bot)** - auto-labels new
  issues by keyword rules and flags likely duplicates by title similarity.
- **[auto-release-notes](packages/auto-release-notes)** - builds a grouped
  (feat/fix/chore/...) release body from merged PRs between two tags.

## Install

```bash
pnpm install
pnpm build
```

Each package builds/tests independently - there are no cross-package runtime
dependencies, so `pnpm --filter <package> build` works standalone too.

## Development

```bash
pnpm build       # tsc build in every package
pnpm typecheck   # tsc --noEmit in every package
pnpm test        # vitest run in every package (no real network calls)
```

Every package has its own `README.md` (setup/usage) and `.env.example` (required env
vars, secrets left as placeholders - never commit a real `.env`).

## License

[MIT](LICENSE)
