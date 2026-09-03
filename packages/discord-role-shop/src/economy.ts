import type { DatabaseSync } from "node:sqlite";

export type PurchaseResult =
  | { success: true; newBalance: number }
  | { success: false; reason: "insufficient_funds" };

/** Current point balance for a user in a guild, 0 if they have no row yet. */
export function getBalance(db: DatabaseSync, userId: string, guildId: string): number {
  const row = db
    .prepare("SELECT points FROM balances WHERE user_id = ? AND guild_id = ?")
    .get(userId, guildId) as { points: number } | undefined;
  return row?.points ?? 0;
}

/** Adds points earned by activity. amount must be positive - use purchaseRole to deduct. */
export function addPoints(
  db: DatabaseSync,
  userId: string,
  guildId: string,
  amount: number,
): number {
  if (amount <= 0) {
    throw new Error("addPoints: amount pozitif olmalı.");
  }
  db.prepare(
    `INSERT INTO balances (user_id, guild_id, points)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id, guild_id)
     DO UPDATE SET points = points + excluded.points`,
  ).run(userId, guildId, amount);
  return getBalance(db, userId, guildId);
}

/** Updates the last_earned_at timestamp used for the message-activity cooldown. */
export function setLastEarnedAt(
  db: DatabaseSync,
  userId: string,
  guildId: string,
  isoTimestamp: string,
): void {
  db.prepare(
    `INSERT INTO balances (user_id, guild_id, points, last_earned_at)
     VALUES (?, ?, 0, ?)
     ON CONFLICT (user_id, guild_id)
     DO UPDATE SET last_earned_at = excluded.last_earned_at`,
  ).run(userId, guildId, isoTimestamp);
}

export function getLastEarnedAt(
  db: DatabaseSync,
  userId: string,
  guildId: string,
): string | null {
  const row = db
    .prepare("SELECT last_earned_at FROM balances WHERE user_id = ? AND guild_id = ?")
    .get(userId, guildId) as { last_earned_at: string | null } | undefined;
  return row?.last_earned_at ?? null;
}

/** Attempts to buy a role for `price` points. Never touches the DB on insufficient funds. */
export function purchaseRole(
  db: DatabaseSync,
  userId: string,
  guildId: string,
  roleId: string,
  price: number,
): PurchaseResult {
  const balance = getBalance(db, userId, guildId);
  if (balance < price) {
    return { success: false, reason: "insufficient_funds" };
  }

  db.prepare("UPDATE balances SET points = points - ? WHERE user_id = ? AND guild_id = ?").run(
    price,
    userId,
    guildId,
  );
  db.prepare(
    `INSERT INTO purchases (user_id, guild_id, role_id, price, purchased_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, guildId, roleId, price, new Date().toISOString());

  return { success: true, newBalance: getBalance(db, userId, guildId) };
}
