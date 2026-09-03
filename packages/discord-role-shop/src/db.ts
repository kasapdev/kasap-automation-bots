import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let db: DatabaseSync | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS balances (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    last_earned_at TEXT,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    purchased_at TEXT NOT NULL
  );
`;

/** Opens (creating if needed) the SQLite store and ensures the schema exists.
 * Call once per process at startup; pass ":memory:" in tests for a real, fast,
 * throwaway database instead of a mock. */
export function initDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  db = new DatabaseSync(dbPath);
  if (dbPath !== ":memory:") {
    // WAL is meaningless for an in-memory database and some sqlite builds warn about it.
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec(SCHEMA);
  return db;
}

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error("Veritabanı henüz başlatılmadı. Önce initDatabase(dbPath) çağırın.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
