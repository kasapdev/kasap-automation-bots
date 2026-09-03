# Discord Role Shop

A discord.js v14 bot implementing a simple point/currency economy: members earn points
from message activity, `/shop` lists purchasable roles, and `/buy` deducts points and
assigns the role if the member can afford it. All balances and purchase history persist
in a local SQLite file via Node's built-in `node:sqlite` module - no extra database
dependency required.

## How the point economy works

1. Every non-bot message in a guild is a chance to earn points (`src/index.ts`, on
   `Events.MessageCreate`).
2. `computeEarnedPoints` (`src/activityTracker.ts`) checks the sender's
   `last_earned_at` timestamp for that guild: if it's their first message ever, or the
   configured cooldown (`MESSAGE_COOLDOWN_MS`) has fully elapsed since their last
   earn, they receive `POINTS_PER_MESSAGE` points; otherwise they earn 0 for that
   message (still on cooldown).
3. Earned points are added via `addPoints` (`src/economy.ts`) and the timestamp is
   updated, all scoped per `(user_id, guild_id)` so balances never leak across guilds.
4. `/shop` lists every role in the configured price list with its cost and buy-slug.
5. `/buy role:<slug>` looks up the role by slug, and calls `purchaseRole`
   (`src/economy.ts`): if the balance is insufficient nothing in the database changes
   and the user gets a Turkish error; otherwise points are deducted, a `purchases` row
   is recorded, and the role is assigned via `interaction.member.roles.add(roleId)`.

All user-facing replies (shop listing, purchase confirmation, errors) are in Turkish.

## Setup

### 1. Discord Developer Portal

1. Go to https://discord.com/developers/applications -> **New Application**.
2. **Bot** tab -> **Reset Token** to get a token, put it in `.env` as `DISCORD_TOKEN`.
3. On the same page, under **Privileged Gateway Intents**, enable **Message Content
   Intent** - without it every incoming `message.content` arrives empty and the bot can
   never award activity points.
4. **OAuth2 -> URL Generator**: scope `bot` and `applications.commands`, permissions at
   least `Send Messages`, `View Channels`, `Manage Roles` (required for the bot to
   assign purchased roles - its own top role must sit above every purchasable role in
   the server's role list). Use the generated link to invite the bot to your server.

### 2. Discord server side

- Create the roles you want to sell, and make sure the bot's own role is positioned
  above all of them in Server Settings -> Roles (Discord's permission model forbids a
  bot from assigning a role higher than or equal to its own).
- Copy each sellable role's ID (enable Developer Mode in Discord settings, then
  right-click the role -> Copy Role ID) for your shop config (see below).

### 3. `.env` file

```bash
cp .env.example .env
```

then fill in the values (see [.env.example](.env.example) - every line is commented).

### 4. Shop price list

```bash
cp shop-config.example.json shop-config.json
```

Edit `shop-config.json` with your real role IDs, display names, and prices:

```json
[
  { "roleId": "123456789012345678", "roleName": "VIP", "price": 500 }
]
```

The IDs in `shop-config.example.json` are placeholders (all zeros / all nines) - never
real role IDs. Point `SHOP_CONFIG_FILE` at your file if you don't use the default
`./shop-config.json`.

### 5. Buy-slugs

Each role's `/buy` argument is derived from its `roleName` by `slugifyRoleName`
(`src/roleSlug.ts`): lowercased, diacritics stripped to their closest ASCII letter
(e.g. "Üye" -> "uye"), and anything that isn't a letter or digit collapsed to a single
hyphen. `/shop` always shows the exact slug to use, e.g. `/buy role:vip`.

### 6. Run

From the repo root:

```bash
pnpm install
pnpm --filter @kasap/discord-role-shop dev    # tsx watch, development mode
```

Production:

```bash
pnpm --filter @kasap/discord-role-shop build
pnpm --filter @kasap/discord-role-shop start
```

## Testing

```bash
pnpm --filter @kasap/discord-role-shop test
```

Tests use real, in-memory `node:sqlite` databases (`:memory:`) for the economy and
activity-cooldown logic - genuine database behavior, not mocks - and fake interaction
objects (cast pattern) for the command handlers. No test ever opens a real Discord
gateway connection.
