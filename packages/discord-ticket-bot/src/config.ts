export interface TicketBotConfig {
  discordToken: string;
  /** Category channel new ticket channels are created under, if any. */
  ticketCategoryId?: string;
  /** Role granted access to every ticket channel alongside the ticket opener. */
  staffRoleId?: string;
  /** Max number of simultaneously open tickets a single user may have. */
  maxTicketsPerUser: number;
  /** Channel where the "open a ticket" button/command message lives. */
  openTicketChannelId?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} .env dosyasında tanımlı değil. .env.example dosyasına bakın.`);
  }
  return value;
}

export function loadConfig(): TicketBotConfig {
  return {
    discordToken: requireEnv("DISCORD_TOKEN"),
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    staffRoleId: process.env.STAFF_ROLE_ID,
    maxTicketsPerUser: parseInt(process.env.MAX_TICKETS_PER_USER ?? "1", 10),
    openTicketChannelId: process.env.OPEN_TICKET_CHANNEL_ID,
  };
}
