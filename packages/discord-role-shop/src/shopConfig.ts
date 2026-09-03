import { readFileSync } from "node:fs";

export interface ShopItem {
  roleId: string;
  roleName: string;
  price: number;
}

/**
 * Reads the shop price list from a JSON file (see shop-config.example.json for the
 * expected shape). Configure the path via SHOP_CONFIG_FILE.
 */
export function loadShopConfig(configPath: string): ShopItem[] {
  const raw = readFileSync(configPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${configPath} bir JSON dizisi (array) içermeli.`);
  }

  return parsed.map((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).roleId !== "string" ||
      typeof (entry as Record<string, unknown>).roleName !== "string" ||
      typeof (entry as Record<string, unknown>).price !== "number"
    ) {
      throw new Error(
        `${configPath} içindeki ${index}. öğe geçersiz: { roleId, roleName, price } bekleniyor.`,
      );
    }
    const item = entry as { roleId: string; roleName: string; price: number };
    return { roleId: item.roleId, roleName: item.roleName, price: item.price };
  });
}
