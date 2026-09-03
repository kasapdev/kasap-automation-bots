# Discord Ticket Bot

A discord.js v14 support-ticket system. A user runs the `/ticket-ac` slash command to
open a private ticket channel just for them (plus an optional staff role), with a
"Talebi Kapat" (Close Ticket) button that deletes the channel again. Each user is
limited to a configurable number of simultaneously open tickets.

All bot-facing strings (embeds/messages, button labels, replies) are in Turkish; code
and comments are in English.

## How it works

1. A user runs `/ticket-ac` (`interactions/openTicket.ts`).
2. `canOpenTicket` (`ticketLimiter.ts`) checks the user's current open-ticket count
   against `MAX_TICKETS_PER_USER`. Over the limit, the bot replies ephemerally in
   Turkish and does nothing else.
3. Under the limit, the bot creates a private text channel
   (`buildTicketChannelName` / `buildTicketPermissionOverwrites` in `ticketNaming.ts`):
   `@everyone` is denied `ViewChannel`; the ticket opener, the bot itself, and the
   optional `STAFF_ROLE_ID` role are granted `ViewChannel` + `SendMessages` +
   `ReadMessageHistory`. The channel is created under `TICKET_CATEGORY_ID` if set.
4. A Turkish welcome message with a "Talebi Kapat" button is posted in the new
   channel, the user's open-ticket count is incremented, and the bot replies
   ephemerally with a link to the new channel.
5. Clicking "Talebi Kapat" (`interactions/closeTicket.ts`) replies with a short
   confirmation, deletes the channel, and decrements the owning user's open-ticket
   count.

Ticket ownership (which user opened which channel) and the open-ticket counts are
both tracked in memory for this package's scope - see "Simplifications" below.

## Setup

### 1. Discord Developer Portal

1. Go to https://discord.com/developers/applications → **New Application**.
2. **Bot** tab → **Reset Token** to get a token, put it in `.env` as `DISCORD_TOKEN`.
   Keep it secret - never commit it.
3. No privileged gateway intents are required: this bot only needs the `Guilds`
   intent (it reacts to slash commands and button clicks, not message content), so
   leave **Message Content Intent** off.
4. **OAuth2 → URL Generator**: select scopes `bot` and `applications.commands`, and
   permissions `Manage Channels`, `View Channels`, `Send Messages`, and
   `Read Message History` (the bot needs `Manage Channels` to create and delete
   ticket channels). Use the generated URL to invite the bot to your server.

### 2. Discord server side

- Create a category for tickets (optional) and copy its ID (Developer Mode →
  right-click the category → **Copy Category ID**) into `TICKET_CATEGORY_ID`.
- If you want a staff role to see every ticket, copy its ID (right-click the role in
  **Server Settings → Roles** → **Copy Role ID**) into `STAFF_ROLE_ID`.
- Optionally note the channel ID where you'll tell users to run `/ticket-ac` into
  `OPEN_TICKET_CHANNEL_ID` (informational only - not currently enforced by the bot).

### 3. .env file

```bash
cp .env.example .env
```

then fill in the values (see [.env.example](.env.example) - every line has a comment).

### 4. Register the slash command

`/ticket-ac` must be registered with Discord before it will show up. This package
does not ship a separate registration script; register it with the
[discord.js REST/Routes API](https://discord.js.org/docs/packages/discord.js/main/ApplicationCommandDataResolvable:TypeAlias)
using the `openTicketCommand` `SlashCommandBuilder` exported from
[src/index.ts](src/index.ts), e.g. in a one-off script:

```ts
import { REST, Routes } from "discord.js";
import { openTicketCommand } from "./src/index.js";

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
await rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID!, process.env.GUILD_ID!), {
  body: [openTicketCommand.toJSON()],
});
```

(Use `Routes.applicationCommands` instead for a global command - it can take up to an
hour to propagate; guild commands are instant, which is more convenient in development.)

### 5. Run

From the workspace root:

```bash
pnpm install
pnpm --filter @kasap/discord-ticket-bot dev    # tsx watch, development mode
```

For production:

```bash
pnpm --filter @kasap/discord-ticket-bot build
pnpm --filter @kasap/discord-ticket-bot start
```

## Usage

Run `/ticket-ac` in your server to open a ticket. Click "Talebi Kapat" in the ticket
channel to close it.

## Testing

```bash
pnpm --filter @kasap/discord-ticket-bot test
```

Pure logic (`ticketNaming.ts`, `ticketLimiter.ts`) is unit-tested directly. The
interaction handlers (`interactions/openTicket.ts`, `interactions/closeTicket.ts`) are
tested by passing hand-built fake interaction objects (cast `as unknown as
ChatInputCommandInteraction` / `ButtonInteraction`) with `vi.fn()` mocks for the
discord.js methods they call (`reply`, `guild.channels.create`, `channel.delete`) -
no real Discord gateway connection is ever made in tests.

## Simplifications

- Ticket ownership (`channelId -> userId`) and open-ticket counts are both tracked in
  plain in-memory `Map`s (see `ticketLimiter.ts`'s `TicketStore` interface and
  `interactions/openTicket.ts`'s `channelOwners` map). Both reset on restart. The
  `TicketStore` interface is designed so a persistent, DB-backed implementation can
  later replace `createInMemoryTicketStore()` without touching any calling code; the
  same could be done for ticket ownership.
- The ticket-number suffix used in channel names (`ticket-<user>-<n>`) is a simple
  in-process incrementing counter, not a durable ticket ID - it exists only to keep
  channel names readable/unique per session.
- Slash-command registration is left to the integrator (see "Register the slash
  command" above) rather than bundled as a script, since registration is typically a
  one-off, environment-specific operation (guild vs. global commands).
