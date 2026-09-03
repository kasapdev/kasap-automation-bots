import { describe, expect, it } from "vitest";
import { buildShopReplyContent } from "../src/commands/shop.js";
import { slugifyRoleName } from "../src/roleSlug.js";
import type { ShopItem } from "../src/shopConfig.js";

describe("buildShopReplyContent", () => {
  it("shows a message when the shop is empty", () => {
    const content = buildShopReplyContent([]);
    expect(content).toContain("Rol Mağazası");
    expect(content).toContain("Şu anda satışta rol yok.");
  });

  it("lists every item with Turkish copy and its buy-slug", () => {
    const items: ShopItem[] = [
      { roleId: "111", roleName: "VIP", price: 500 },
      { roleId: "222", roleName: "Moderatör", price: 1000 },
    ];

    const content = buildShopReplyContent(items);

    expect(content).toContain("Rol Mağazası");
    expect(content).toContain("VIP - 500 puan");
    expect(content).toContain("/buy role:vip");
    expect(content).toContain("Moderatör - 1000 puan");
    expect(content).toContain("/buy role:moderator");
  });
});

describe("slugifyRoleName", () => {
  it("replaces spaces with hyphens", () => {
    expect(slugifyRoleName("Super Fan")).toBe("super-fan");
  });

  it("lowercases uppercase names", () => {
    expect(slugifyRoleName("VIP")).toBe("vip");
  });

  it("handles Turkish unicode characters reasonably", () => {
    expect(slugifyRoleName("Moderatör")).toBe("moderator");
    expect(slugifyRoleName("Üye")).toBe("uye");
  });

  it("trims and collapses punctuation into single hyphens", () => {
    expect(slugifyRoleName("  Süper -- Yönetici!! ")).toBe("super-yonetici");
  });
});
