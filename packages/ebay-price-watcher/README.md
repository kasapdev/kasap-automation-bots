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
   for each watched item and reads its current price and currency.
4. `currency.ts` converts that price into your configured `BASE_CURRENCY` (see
   [Multi-Currency Normalization](#multi-currency-normalization) below) before anything
   is compared.
5. `state.ts` reads/writes a local JSON file (`EBAY_STATE_FILE`, default
   `./data/ebay-price-state.json`) that remembers the last price seen for each item (both
   in its own listing currency and normalized into the base currency), so a drop can be
   detected on the next run.
6. `priceDiff.ts` is a pure function comparing the previous and current price - always in
   the base currency, so items are never diffed across mismatched currencies.
7. When a drop is detected, `discordNotify.ts` builds a Turkish embed and posts it to
   your `DISCORD_WEBHOOK_URL`.
8. `poll.ts` orchestrates one full pass over all watched items (`pollOnce`); `index.ts`
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

## Multi-Currency Normalization

The eBay Browse API returns each item's price in whatever currency its listing (or
your account's marketplace) uses - two watched items can easily come back in different
currencies (e.g. `USD` and `EUR`), and even one item's currency can change between
checks. Comparing those raw numbers directly would be meaningless (is `85 EUR` a drop
from `90 USD`? You can't tell without converting).

To fix that, every fetched price is converted into one **base currency**
(`BASE_CURRENCY`, default `USD`) before it's stored or diffed:

- `currency.ts`'s `fetchExchangeRate(from, to, fetchImpl?)` gets the current rate from
  the free [Frankfurter API](https://frankfurter.dev/) (ECB reference rates, no API key
  needed) - same injectable-`fetch` pattern as every other API call in this package, so
  it's fully mockable in tests. Same-currency conversions (the common case) short-circuit
  to a rate of `1` with **no network call at all**. Rates are cached in memory for an
  hour so a poll pass over many items in one non-base currency only fetches the rate once.
- `pollOnce` converts each item's current price into `BASE_CURRENCY` and diffs *that*
  against the base-currency price stored from the previous run - never the raw listing
  price. If `BASE_CURRENCY` changes between runs (or you're upgrading from a state file
  written before this feature existed), the stale base-currency value is discarded and
  treated as "no previous price" rather than silently compared across currencies.
- The Discord embed for a drop always shows the base-currency comparison; when the
  item's own listing currency differs from `BASE_CURRENCY`, it adds a line with the
  original listing price for context.
- `sumBaseCurrencyValue(results)` totals every successfully-checked item's current
  price in the base currency, so a portfolio of items in different currencies can be
  compared/summed meaningfully - `index.ts` logs this total after every check.

Example - watching one USD item and one EUR item with `BASE_CURRENCY=USD`:

```bash
$ BASE_CURRENCY=USD pnpm --filter @kasap/ebay-price-watcher start
[ebay-price-watcher] 2 ürün kontrol ediliyor (baz para birimi: USD)...
[ebay-price-watcher] Değişiklik yok: US Item (v1|111|0) - 129.99 USD
[ebay-price-watcher] Fiyat düştü: EU Item (v1|222|0) - 90 -> 80 EUR (88.13 USD)
[ebay-price-watcher] Toplam izlenen değer: 218.12 USD
```

Programmatically:

```ts
import { fetchExchangeRate, convertPrice } from "./src/currency.js";

const rate = await fetchExchangeRate("EUR", "USD"); // real network call, uses Frankfurter
const usdPrice = convertPrice(80, rate); // 80 EUR -> ~88.13 USD
```

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

All eBay OAuth, eBay Browse API, Frankfurter exchange-rate, and Discord webhook calls
are mocked (`vi.fn()` / injected `fetch`) - no real network calls are made during tests.
`state.ts` is tested against a real temporary directory (local disk I/O, not network),
which is fine and intentional.
