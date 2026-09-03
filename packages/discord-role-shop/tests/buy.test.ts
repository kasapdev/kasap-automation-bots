import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatInputCommandInteraction } from "discord.js";
import { initDatabase, closeDatabase } from "../src/db.js";
import { addPoints, getBalance } from "../src/economy.js";
import { handleBuyInteraction } from "../src/commands/buy.js";
import type { ShopItem } from "../src/shopConfig.js";

const SHOP_ITEMS: ShopItem[] = [{ roleId: "role-vip-id", roleName: "VIP", price: 500 }];

function fakeInteraction(overrides: {
  roleOption: string | null;
  userId?: string;
}): { interaction: ChatInputCommandInteraction; reply: ReturnType<typeof vi.fn>; rolesAdd: ReturnType<typeof vi.fn> } {
  const reply = vi.fn().mockResolvedValue(undefined);
  const rolesAdd = vi.fn().mockResolvedValue(undefined);

  const interaction = {
    options: { getString: () => overrides.roleOption },
    user: { id: overrides.userId ?? "user-1" },
    member: { roles: { add: rolesAdd } },
    reply,
  } as unknown as ChatInputCommandInteraction;

  return { interaction, reply, rolesAdd };
}

describe("handleBuyInteraction", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = initDatabase(":memory:");
  });

  afterEach(() => {
    closeDatabase();
  });

  it("completes a successful purchase: deducts points, assigns the role, replies in Turkish", async () => {
    addPoints(db, "user-1", "guild-1", 500);
    const { interaction, reply, rolesAdd } = fakeInteraction({ roleOption: "vip" });

    await handleBuyInteraction(interaction, db, SHOP_ITEMS, "guild-1");

    expect(rolesAdd).toHaveBeenCalledWith("role-vip-id");
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("VIP rolünü satın aldınız! Kalan bakiye: 0 puan."),
      }),
    );
    expect(getBalance(db, "user-1", "guild-1")).toBe(0);
  });

  it("rejects insufficient funds without assigning the role or touching the balance", async () => {
    addPoints(db, "user-1", "guild-1", 100);
    const { interaction, reply, rolesAdd } = fakeInteraction({ roleOption: "vip" });

    await handleBuyInteraction(interaction, db, SHOP_ITEMS, "guild-1");

    expect(rolesAdd).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Yetersiz puan! Bakiyeniz: 100, gereken: 500."),
      }),
    );
    expect(getBalance(db, "user-1", "guild-1")).toBe(100);
  });

  it("replies with a Turkish error for an unknown role slug and never charges the user", async () => {
    addPoints(db, "user-1", "guild-1", 1000);
    const { interaction, reply, rolesAdd } = fakeInteraction({ roleOption: "no-such-role" });

    await handleBuyInteraction(interaction, db, SHOP_ITEMS, "guild-1");

    expect(rolesAdd).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Bu rol mağazada yok." }),
    );
    expect(getBalance(db, "user-1", "guild-1")).toBe(1000);
  });
});
