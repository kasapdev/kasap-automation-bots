export interface ShopConfig {
  discordToken: string;
  dbPath: string;
  shopConfigFile: string;
  pointsPerMessage: number;
  messageCooldownMs: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} .env dosyasında tanımlı değil. .env.example dosyasına bakın.`);
  }
  return value;
}

function readIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} .env'de geçerli bir tam sayı değil: "${raw}"`);
  }
  return parsed;
}

export function loadConfig(): ShopConfig {
  return {
    discordToken: requireEnv("DISCORD_TOKEN"),
    dbPath: process.env.SHOP_DB_PATH ?? "./data/role-shop.sqlite",
    shopConfigFile: process.env.SHOP_CONFIG_FILE ?? "./shop-config.json",
    pointsPerMessage: readIntEnv("POINTS_PER_MESSAGE", 1),
    messageCooldownMs: readIntEnv("MESSAGE_COOLDOWN_MS", 60000),
  };
}
