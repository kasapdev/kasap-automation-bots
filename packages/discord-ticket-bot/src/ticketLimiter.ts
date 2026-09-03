/** Injectable store so the open-ticket count can be tracked independently of Discord. */
export interface TicketStore {
  getOpenCount(userId: string): number;
  increment(userId: string): void;
  decrement(userId: string): void;
}

/**
 * In-memory implementation used at runtime. The bot's ticket count does not
 * need to survive a restart for this package's scope, but a persistent
 * DB-backed store (e.g. SQLite/Redis) could later replace this via the same
 * `TicketStore` interface without touching any calling code.
 */
export function createInMemoryTicketStore(): TicketStore {
  const counts = new Map<string, number>();

  return {
    getOpenCount(userId: string): number {
      return counts.get(userId) ?? 0;
    },
    increment(userId: string): void {
      counts.set(userId, (counts.get(userId) ?? 0) + 1);
    },
    decrement(userId: string): void {
      const next = (counts.get(userId) ?? 0) - 1;
      if (next <= 0) {
        counts.delete(userId);
      } else {
        counts.set(userId, next);
      }
    },
  };
}

/** Whether a user is still under the configured max-open-tickets limit. */
export function canOpenTicket(userId: string, store: TicketStore, maxPerUser: number): boolean {
  return store.getOpenCount(userId) < maxPerUser;
}
