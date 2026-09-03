import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { DatabaseSync } from "node:sqlite";
import type { ShopItem } from "../shopConfig.js";
import { slugifyRoleName } from "../roleSlug.js";
import { getBalance, purchaseRole } from "../economy.js";

export async function handleBuyInteraction(
  interaction: ChatInputCommandInteraction,
  db: DatabaseSync,
  shopItems: ShopItem[],
  guildId: string,
): Promise<void> {
  const roleSlug = interaction.options.getString("role");
  const item = shopItems.find((candidate) => slugifyRoleName(candidate.roleName) === roleSlug);

  if (!item) {
    await interaction.reply({ content: "Bu rol mağazada yok.", ephemeral: true });
    return;
  }

  const userId = interaction.user.id;
  const result = purchaseRole(db, userId, guildId, item.roleId, item.price);

  if (!result.success) {
    const balance = getBalance(db, userId, guildId);
    await interaction.reply({
      content: `Yetersiz puan! Bakiyeniz: ${balance}, gereken: ${item.price}.`,
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  await member.roles.add(item.roleId);

  await interaction.reply({
    content: `✅ ${item.roleName} rolünü satın aldınız! Kalan bakiye: ${result.newBalance} puan.`,
    ephemeral: true,
  });
}
