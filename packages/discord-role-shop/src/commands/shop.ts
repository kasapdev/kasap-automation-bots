import type { ChatInputCommandInteraction } from "discord.js";
import type { ShopItem } from "../shopConfig.js";
import { slugifyRoleName } from "../roleSlug.js";

/**
 * Builds the Turkish /shop reply content listing every purchasable role. The buy-slug
 * shown next to each item (e.g. "vip") is what the user passes as the "role" option to
 * /buy, and is produced by the same slugifyRoleName used to resolve it in commands/buy.ts.
 */
export function buildShopReplyContent(items: ShopItem[]): string {
  if (items.length === 0) {
    return "🛒 **Rol Mağazası**\nŞu anda satışta rol yok.";
  }

  const lines = items.map((item) => {
    const slug = slugifyRoleName(item.roleName);
    return `• ${item.roleName} - ${item.price} puan (\`/buy role:${slug}\`)`;
  });

  return ["🛒 **Rol Mağazası**", ...lines].join("\n");
}

export async function handleShopInteraction(
  interaction: ChatInputCommandInteraction,
  shopItems: ShopItem[],
): Promise<void> {
  await interaction.reply({
    content: buildShopReplyContent(shopItems),
    ephemeral: true,
  });
}
