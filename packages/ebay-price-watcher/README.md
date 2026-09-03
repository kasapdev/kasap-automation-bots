# ebay-price-watcher

A small Node CLI that polls a configured list of eBay items for price drops using the
eBay Browse API, and posts a Turkish-language Discord webhook message whenever a
watched item's price goes down.

## How it works

1. `config.ts` loads your eBay/Discord credentials from environment variables and the
   list of watched items from a local JSON file (`EBAY_ITEMS_FILE`, default
   `./ebay-items.json`).
2. `auth.ts` gets an eBay OAuth2 access token via the client-credentials flow and caches
   it in memory until shortly before it expires, so it isn't re-requested on every check.
3. `ebayClient.ts` calls the eBay Browse API `GET /buy/browse/v1/item/{item_id}` endpoint
   for each watched item and reads its current price.
4. `state.ts` reads/writes a local JSON file (`EBAY_STATE_FILE`, default
   `./data/ebay-price-state.json`) that remembers the last price seen for each item, so a
   drop can be detected on the next run.
5. `priceDiff.ts` is a pure function comparing the previous and current price.
6. When a drop is detected, `discordNotify.ts` builds a Turkish embed and posts it to
   your `DISCORD_WEBHOOK_URL`.
7. `poll.ts` orchestrates one full pass over all watched items (`pollOnce`); `index.ts`
   is the thin CLI entry point that runs one pass, or loops on an interval with `--watch`.

## Setup

### 1. eBay Developer Program

1. Create an app at https://developer.ebay.com/my/keys.
2. Copy the **production** Client ID (App ID) and Client Secret (Cert ID) - this tool
   calls `api.ebay.com`, the production Browse API, not the sandbox.

### 2. Discord webhook

In your Discord server: channel **Settings → Integrations → Webhooks → New Webhook**,
then copy the webhook URL.

### 3. `.env` file

```bash
cp .env.example .env
```

Then fill in the values (see [.env.example](.env.example) for what each variable is and
where to get it):

- `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` - your production eBay app credentials.
- `DISCORD_WEBHOOK_URL` - the webhook URL from step 2.
- `EBAY_ITEMS_FILE` (optional, default `./ebay-items.json`) - path to the watched-items
  file, see below.
- `EBAY_STATE_FILE` (optional, default `./data/ebay-price-state.json`) - where last-seen
  prices are stored.
- `POLL_INTERVAL_MS` (optional, default `900000` = 15 minutes) - how often `--watch`
  re-checks prices.

### 4. Watched items file

Create your own `ebay-items.json` (this file is your personal config data and is not
committed) listing the eBay Browse API item IDs you want to watch:

```json
[
  { "itemId": "v1|123456789|0", "label": "Örnek ürün" }
]
```

See [ebay-items.example.json](ebay-items.example.json) for a placeholder example - the
`itemId` in that file is a fake ID and must be replaced with a real one.

## Usage

Build once (from the workspace root, or inside this package):

```bash
pnpm --filter @kasap/ebay-price-watcher build
```

Run a single check:

```bash
pnpm --filter @kasap/ebay-price-watcher start
```

Run continuously, re-checking every `POLL_INTERVAL_MS`:

```bash
node dist/index.js --watch
# or: WATCH=true node dist/index.js
```

During development:

```bash
pnpm --filter @kasap/ebay-price-watcher dev
```

## Tests

```bash
pnpm --filter @kasap/ebay-price-watcher test
```

All eBay OAuth, eBay Browse API, and Discord webhook calls are mocked (`vi.fn()` /
injected `fetch`) - no real network calls are made during tests. `state.ts` is tested
against a real temporary directory (local disk I/O, not network), which is fine and
intentional.
