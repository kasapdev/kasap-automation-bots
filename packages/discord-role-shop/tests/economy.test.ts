import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDatabase, closeDatabase } from "../src/db.js";
import { addPoints, getBalance, purchaseRole } from "../src/economy.js";

describe("economy", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = initDatabase(":memory:");
  });

  afterEach(() => {
    closeDatabase();
  });

  it("returns 0 balance for a user with no history", () => {
    expect(getBalance(db, "user-1", "guild-1")).toBe(0);
  });

  it("addPoints accumulates across calls and returns the new balance", () => {
    expect(addPoints(db, "user-1", "guild-1", 10)).toBe(10);
    expect(addPoints(db, "user-1", "guild-1", 5)).toBe(15);
    expect(getBalance(db, "user-1", "guild-1")).toBe(15);
  });

  it("keeps balances isolated per guild", () => {
    addPoints(db, "user-1", "guild-1", 10);
    addPoints(db, "user-1", "guild-2", 3);
    expect(getBalance(db, "user-1", "guild-1")).toBe(10);
    expect(getBalance(db, "user-1", "guild-2")).toBe(3);
  });

  it("rejects non-positive amounts", () => {
    expect(() => addPoints(db, "user-1", "guild-1", 0)).toThrow();
    expect(() => addPoints(db, "user-1", "guild-1", -5)).toThrow();
  });

  it("purchaseRole succeeds when funds are sufficient and records the purchase", () => {
    addPoints(db, "user-1", "guild-1", 500);

    const result = purchaseRole(db, "user-1", "guild-1", "role-vip", 500);

    expect(result).toEqual({ success: true, newBalance: 0 });
    expect(getBalance(db, "user-1", "guild-1")).toBe(0);

    const row = db
      .prepare("SELECT role_id, price FROM purchases WHERE user_id = ?")
      .get("user-1") as { role_id: string; price: number };
    expect(row.role_id).toBe("role-vip");
    expect(row.price).toBe(500);
  });

  it("purchaseRole fails on insufficient funds and leaves the balance unchanged", () => {
    addPoints(db, "user-1", "guild-1", 100);

    const result = purchaseRole(db, "user-1", "guild-1", "role-vip", 500);

    expect(result).toEqual({ success: false, reason: "insufficient_funds" });
    expect(getBalance(db, "user-1", "guild-1")).toBe(100);
  });

  it("deducts correctly across two consecutive purchases", () => {
    addPoints(db, "user-1", "guild-1", 1000);

    const first = purchaseRole(db, "user-1", "guild-1", "role-vip", 300);
    const second = purchaseRole(db, "user-1", "guild-1", "role-mod", 400);

    expect(first).toEqual({ success: true, newBalance: 700 });
    expect(second).toEqual({ success: true, newBalance: 300 });
    expect(getBalance(db, "user-1", "guild-1")).toBe(300);
  });
});
