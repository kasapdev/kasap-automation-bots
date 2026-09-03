# @kasap/domain-expiry-notifier

A CLI that checks a configured list of domains for upcoming WHOIS registration
expiry, and a configured list of hosts for upcoming TLS certificate expiry,
and warns (console output, plus an optional Discord webhook notification in
Turkish) when something is within N days of expiring.

## Overview

- Queries the WHOIS server for each configured domain over a raw TCP socket
  (`node:net`), using a small built-in map of common TLDs to their WHOIS
  server (see `TLD_WHOIS_SERVERS` in `src/whoisClient.ts`).
- Parses the registration expiry date out of the WHOIS response text, trying
  several known field-name patterns used by different registries/registrars.
- Opens a real TLS handshake (`node:tls`) to each configured host and reads
  the peer certificate's `valid_to` date.
- Prints a Turkish status line per domain/host (OK or warning).
- If any warnings are found and `DISCORD_WEBHOOK_URL` is set, posts one
  combined Turkish embed to that Discord webhook.
- A single failed WHOIS lookup or TLS check is logged and skipped - it does
  not abort the rest of the run.

## Setup

```bash
pnpm install
cp .env.example .env
cp expiry-config.example.json expiry-config.json
```

Edit `expiry-config.json` with the domains/hosts you actually want to
monitor, and (optionally) fill in `DISCORD_WEBHOOK_URL` in `.env`.

## Configuration

### `expiry-config.json`

Path is read from the `EXPIRY_CONFIG_FILE` env var (default
`./expiry-config.json`). Shape:

```json
{
  "domains": ["example.com"],
  "sslHosts": ["example.com"],
  "warnDaysThreshold": 30
}
```

- `domains` - domains to WHOIS-query for registration expiry.
- `sslHosts` - hosts to check TLS certificate expiry for, over port 443.
- `warnDaysThreshold` - warn when a domain/certificate is within this many
  days of expiring (an already-expired item always warns too).

### Environment variables (`.env`)

| Variable              | Required | Description                                                          |
| ---------------------- | -------- | ---------------------------------------------------------------------|
| `DISCORD_WEBHOOK_URL`   | No       | Discord channel > Integrations > Webhooks > New Webhook > Copy URL.  |
| `EXPIRY_CONFIG_FILE`    | No       | Path to the config JSON file. Defaults to `./expiry-config.json`.    |

## Usage

```bash
pnpm --filter @kasap/domain-expiry-notifier build
pnpm --filter @kasap/domain-expiry-notifier start
```

Or during development, run the TypeScript source directly with a runner of
your choice (e.g. `tsx src/index.ts`).

## WHOIS coverage note

The built-in `TLD_WHOIS_SERVERS` map only covers a handful of common TLDs
(`com`, `net`, `org`, `io`, `dev`, `app`, `info`, `co`). Any domain whose TLD
isn't in that map falls back to `whois.iana.org`, which returns a referral
response rather than expiry data directly. Extend the map in
`src/whoisClient.ts` with more TLD -> WHOIS-server entries as needed.

## Testing

```bash
pnpm --filter @kasap/domain-expiry-notifier test
```

All tests run offline:

- `expiryParser.test.ts` - thorough fixture-based tests of the WHOIS expiry
  field parsing against several realistic registry response styles.
- `expiryCheck.test.ts` - threshold/boundary tests for the warning logic.
- `whoisClient.test.ts` - TLD -> server selection, plus `queryWhois` tested
  against a real local `net.createServer` on `127.0.0.1` (no external
  network access).
- `sslCheck.test.ts` - `checkSslExpiry` tested against an injected fake TLS
  socket.
- `discordNotify.test.ts` - embed shape/Turkish copy, and the webhook POST
  request shape (mocked `fetch`).
