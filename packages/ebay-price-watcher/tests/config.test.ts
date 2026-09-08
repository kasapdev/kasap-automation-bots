import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

const REQUIRED_ENV = {
  EBAY_CLIENT_ID: "client-id",
  EBAY_CLIENT_SECRET: "client-secret",
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test",
};

describe("loadConfig - baseCurrency", () => {
  let dir: string;
  let itemsFile: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ebay-price-watcher-config-"));
    itemsFile = join(dir, "items.json");
    writeFileSync(itemsFile, JSON.stringify([{ itemId: "v1|1|0", label: "Item" }]), "utf-8");

    process.env = { ...originalEnv, ...REQUIRED_ENV, EBAY_ITEMS_FILE: itemsFile };
    delete process.env.BASE_CURRENCY;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it("defaults to USD when BASE_CURRENCY is not set", () => {
    const config = loadConfig();
    expect(config.baseCurrency).toBe("USD");
  });

  it("uses BASE_CURRENCY when set, upper-cased", () => {
    process.env.BASE_CURRENCY = "eur";
    const config = loadConfig();
    expect(config.baseCurrency).toBe("EUR");
  });

  it("trims surrounding whitespace on BASE_CURRENCY", () => {
    process.env.BASE_CURRENCY = "  gbp  ";
    const config = loadConfig();
    expect(config.baseCurrency).toBe("GBP");
  });

  it("falls back to the default when BASE_CURRENCY is set to an empty/whitespace string", () => {
    process.env.BASE_CURRENCY = "   ";
    const config = loadConfig();
    expect(config.baseCurrency).toBe("USD");
  });

  it("throws a clear error when BASE_CURRENCY is not a 3-letter code", () => {
    process.env.BASE_CURRENCY = "US";
    expect(() => loadConfig()).toThrow(/BASE_CURRENCY/);
  });

  it("throws a clear error when BASE_CURRENCY contains non-letter characters", () => {
    process.env.BASE_CURRENCY = "US1";
    expect(() => loadConfig()).toThrow(/BASE_CURRENCY/);
  });
});
