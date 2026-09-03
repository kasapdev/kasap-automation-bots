# Server Uptime Bot

Periodically TCP-pings a configured list of hosts/ports, reads local system resource
stats (load average, free memory, and optionally free disk space), and posts a
Turkish-language Discord embed summary via webhook. Zero dependencies beyond
`dotenv` - uses Node's built-in `node:net`, `node:os`, and global `fetch`.

## Overview

1. `config.ts` loads the list of monitored targets from a JSON file and reads timing/
   webhook settings from the environment.
2. `tcpCheck.ts` opens a raw TCP connection to each `host:port` and measures whether it
   connects, times out, or errors.
3. `sysStats.ts` reads local system load average and free memory percentage (disk usage
   is left as an injectable stub - see below).
4. `embed.ts` builds a Discord embed JSON payload with Turkish labels summarizing the
   results.
5. `discordNotify.ts` POSTs that embed to a Discord webhook.
6. `index.ts` wires the above together as a CLI: one check pass by default, or a
   continuous loop with `--watch`.

## Setup

```bash
cp .env.example .env
```

### Required env vars

- `DISCORD_WEBHOOK_URL` - Discord channel → Edit Channel → Integrations → Webhooks →
  New Webhook → Copy URL. Keep this secret, never commit it. If left unset, the bot
  runs in dry-run mode: it prints the status report to the console instead of posting.

### Optional env vars

- `UPTIME_TARGETS_FILE` - path to the JSON file listing monitored targets. Defaults to
  `./uptime-targets.json`.
- `CHECK_TIMEOUT_MS` - per-target TCP connect timeout in milliseconds. Defaults to
  `5000`.
- `POLL_INTERVAL_MS` - how often to re-run a check pass in `--watch` mode, in
  milliseconds. Defaults to `300000` (5 minutes).

### Target list

Create your own `uptime-targets.json` (this file is intentionally not committed -
it may describe real infrastructure). Shape:

```json
[
  { "name": "Minecraft #1", "host": "1.2.3.4", "port": 25565 },
  { "name": "Web Server", "host": "yourdomain.example", "port": 443 }
]
```

See [`uptime-targets.example.json`](uptime-targets.example.json) for a template using
an obviously fake example host - never a real server IP.

## Usage

From the repo root:

```bash
pnpm --filter @kasap/server-uptime-bot dev            # tsx watch, one pass, then exits
pnpm --filter @kasap/server-uptime-bot dev -- --watch  # loop on POLL_INTERVAL_MS
pnpm --filter @kasap/server-uptime-bot dev -- --dry-run # never posts, only prints
```

For prod:

```bash
pnpm --filter @kasap/server-uptime-bot build
pnpm --filter @kasap/server-uptime-bot start -- --watch
```

`--watch` can also be enabled with `WATCH=true`, and `--dry-run` with `DRY_RUN=true`,
for environments where passing CLI flags is inconvenient (e.g. a process manager).

## Disk usage

`sysStats.ts` accepts an injectable `diskCheck` function and defaults to a stub that
resolves `null` (shown in the embed as "bilinmiyor" / unknown). Disk usage is
platform-specific (would need to shell out to `df` on Linux/macOS or
`wmic logicaldisk` / `Get-PSDrive` on Windows and parse the output), which is out of
scope for this initial version - a real implementation can be plugged in later via that
same parameter without touching any callers.

## Testing

```bash
pnpm --filter @kasap/server-uptime-bot test
```

- `tcpCheck.test.ts` exercises real TCP logic against local sockets only: a real
  `net.createServer()` on `127.0.0.1` for the "host is up" case, a just-closed local
  port for the "connection refused" case, and a connection to a reserved/non-routable
  documentation address (`192.0.2.1`, RFC 5737 TEST-NET-1) with a short timeout for the
  "timeout" case - deterministic and fast, no external network dependency.
- `sysStats.test.ts` asserts real `loadAvg1`/`freeMemPct` fall within sane bounds (no
  mocking of `os`), and that the injected `diskCheck` result flows through correctly.
- `embed.test.ts` covers the Turkish embed formatting: all-up, all-down, mixed, and
  null-disk cases.
- `discordNotify.test.ts` mocks `fetch` - no real network call to discord.com is ever
  made in tests.
