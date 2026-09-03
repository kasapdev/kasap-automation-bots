import { PermissionFlagsBits } from "discord.js";

/**
 * Pure helper: build a Discord-safe channel name for a new ticket.
 *
 * Channel names must be lowercase and may only contain letters, digits and
 * hyphens (Discord silently rewrites anything else), so the username is
 * sanitized before being combined with the ticket number.
 */
export function buildTicketChannelName(username: string, ticketNumber: number): string {
  const sanitized = username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20)
    .replace(/^-+|-+$/g, "");

  const base = sanitized.length > 0 ? sanitized : "kullanici";
  return `ticket-${base}-${ticketNumber}`;
}

interface PermissionOverwrite {
  id: string;
  allow: bigint[];
  deny: bigint[];
}

const TICKET_ACCESS_BITS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];

/**
 * Pure helper: compute the permission-overwrite array for a new private
 * ticket channel. @everyone is denied view access; the ticket owner, the
 * bot itself, and (optionally) the configured staff role are all granted
 * view/send/history access.
 */
export function buildTicketPermissionOverwrites(
  guildId: string,
  userId: string,
  staffRoleId: string | undefined,
  botUserId: string,
): PermissionOverwrite[] {
  const overwrites: PermissionOverwrite[] = [
    {
      id: guildId,
      allow: [],
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: userId,
      allow: [...TICKET_ACCESS_BITS],
      deny: [],
    },
    {
      id: botUserId,
      allow: [...TICKET_ACCESS_BITS],
      deny: [],
    },
  ];

  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [...TICKET_ACCESS_BITS],
      deny: [],
    });
  }

  return overwrites;
}
