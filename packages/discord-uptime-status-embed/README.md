# Discord Uptime Status Embed

Periodically TCP-checks a configured list of Berilis server endpoints and keeps a
single Discord message's embed live-updated in place - editing the existing message on
every poll instead of posting a new one - showing Turkish up/down labels per server and
a "last checked" timestamp.

## Overview

1. `config.ts` loads the list of monitored targets from a JSON file and reads the
   Discord token/channel/message settings and timing settings from the environment.
2. `tcpCheck.ts` opens a raw TCP connection to each `host:port` and measures whether it
   connects, times out, or errors. Implemented locally (not imported from the sibling
   `server-uptime-bot` package) - see "Why the duplication?" below.
3. `embedBuilder.ts` is a pure function that builds a Turkish Discord embed payload
   from a set of check results.
4. `embedDiff.ts` is a pure function that structurally compares two embeds, ignoring
   the timestamp, so the bot can tell "did the visible status change" from "only the
   clock changed".
5. `pinnedMessage.ts` finds the bot's existing status message (by known ID, or by
   searching pinned messages) and either edits it in place or sends+pins a new one.
6. `index.ts` wires the above together: on Discord ready, find-or-create the status
   message, then on an interval, TCP-check every target, rebuild the embed, and
   publish it.

### Why the duplication?

This package intentionally reimplements `tcpPing` locally instead of importing it from
the sibling `server-uptime-bot` package. The function is small, stable, and has no
shared state - a small amount of duplication here is preferred over introducing a
shared internal package (and the coupling/versioning overhead that comes with it) for
one function used by two independent bots.

## Discord Developer Portal setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   and create an application (or reuse an existing one).
2. Under **Bot**, create a bot user and copy its **Token** - this is `DISCORD_TOKEN`.
   Keep it secret, never commit it.
3. No privileged **Gateway Intents** need to be enabled - this bot never reads the
   text content of other users' messages. It only needs `Guilds` and `GuildMessages`
   at the code level, both of which are non-privileged.
4. Under **OAuth2 > URL Generator**, select scopes `bot`, and permissions:
   - `View Channel`
   - `Send Messages`
   - `Read Message History` (needed to fetch pinned messages / a known message ID)
   - `Manage Messages` is **not** required - the bot only ever edits its own message
     and pins it, both of which a bot can do to its own messages without that
     permission in the channels it can already send in. If pinning fails due to
     server permission restrictions, grant `Manage Messages` as well.
5. Open the generated URL and invite the bot to your server.
6. Copy the target channel's ID (right-click the channel > Copy Channel ID; requires
   Developer Mode on in Discord's Advanced settings) into `STATUS_CHANNEL_ID`.

## Required env vars

```bash
cp .env.example .env
```

- `DISCORD_TOKEN` - the bot token from step 2 above. Secret, never commit it.
- `STATUS_CHANNEL_ID` - the channel the live status message lives in.

## Optional env vars

- `STATUS_MESSAGE_ID` - see "The pinned message mechanism" below.
- `STATUS_TARGETS_FILE` - path to the JSON file listing monitored servers. Defaults to
  `./status-targets.json`.
- `CHECK_TIMEOUT_MS` - per-server TCP connect timeout in milliseconds. Defaults to
  `5000`.
- `POLL_INTERVAL_MS` - how often to re-check every target and refresh the embed, in
  milliseconds. Defaults to `60000` (1 minute).

### Target list

Create your own `status-targets.json` (this file is intentionally not committed - it
may describe real infrastructure). Shape:

```json
[
  { "name": "Minecraft #1", "host": "1.2.3.4", "port": 25565 },
  { "name": "Web Server", "host": "yourdomain.example", "port": 443 }
]
```

See [`status-targets.example.json`](status-targets.example.json) for a template using
an obviously fake `example.com` host - never a real Berilis server IP.

## The pinned message mechanism

The bot keeps exactly **one** Discord message showing the current status, and edits
that same message's embed in place on every poll rather than posting a new message
each time - this keeps the channel clean and gives a stable link people can bookmark.

- **First run** (`STATUS_MESSAGE_ID` empty): on startup the bot searches
  `STATUS_CHANNEL_ID`'s pinned messages for one it posted before (matched by its own
  author ID and an embed title of "Berilis Sunucu Durumu"). If none is found, it sends
  a new message and pins it. Either way, the bot logs the resulting message ID to the
  console:

  ```
  Bu mesaj ID'sini kararlılık için .env dosyasındaki STATUS_MESSAGE_ID değişkenine kopyalayın: 123456789012345678
  ```

- **Copy that ID into `.env`** as `STATUS_MESSAGE_ID`. On subsequent restarts the bot
  fetches that exact message directly instead of searching pinned messages, which is
  faster and more reliable (e.g. if the message somehow got unpinned).
- If the message referenced by `STATUS_MESSAGE_ID` was deleted, the bot falls back to
  searching pinned messages, then to creating a new one, the same as a first run.

## Usage

From the repo root:

```bash
pnpm --filter @kasap/discord-uptime-status-embed dev    # tsx watch
```

For prod:

```bash
pnpm --filter @kasap/discord-uptime-status-embed build
pnpm --filter @kasap/discord-uptime-status-embed start
```

## Testing

```bash
pnpm --filter @kasap/discord-uptime-status-embed test
```

- `tcpCheck.test.ts` exercises real TCP logic against local sockets only: a real
  `net.createServer()` on `127.0.0.1` for the "host is up" case, a just-closed local
  port for the "connection refused" case, and a connection to a reserved/non-routable
  documentation address (`192.0.2.1`, RFC 5737 TEST-NET-1) with a short timeout for the
  "timeout" case - deterministic and fast, no external network dependency.
- `embedBuilder.test.ts` covers the Turkish embed formatting: all-up (green), all-down
  (red), mixed (orange), latency display, and a single-server case.
- `embedDiff.test.ts` covers structural equality: identical status with only the
  timestamp differing (equal), a server flipping up/down (not equal), a different
  server count (not equal), and a latency-only change (not equal, deliberately - see
  the comment in `embedDiff.ts`).
- `pinnedMessage.test.ts` mocks a discord.js-shaped channel/message object (never a
  real Discord gateway connection): fetch-by-known-ID found/not-found, searching
  pinned messages for a match/no-match (including ignoring another author's pinned
  message), and that publishing dispatches to `.edit()` when there's an existing
  message versus `.send()` + `.pin()` when there isn't.
