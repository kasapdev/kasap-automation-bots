import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, writeState, type PriceState } from "../src/state.js";

describe("state read/write", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ebay-price-watcher-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty object when the state file does not exist yet", () => {
    const statePath = join(dir, "state.json");
    expect(readState(statePath)).toEqual({});
  });

  it("round-trips written state and creates missing parent directories", () => {
    const statePath = join(dir, "nested", "state.json");
    const state: PriceState = {
      "v1|123456789|0": {
        lastPrice: 99.99,
        currency: "USD",
        lastCheckedIso: "2026-01-01T00:00:00.000Z",
      },
    };

    writeState(statePath, state);
    const result = readState(statePath);

    expect(result).toEqual(state);
  });

  it("round-trips new fields written by multi-currency normalization (lastPriceBase/baseCurrency)", () => {
    const statePath = join(dir, "state.json");
    const state: PriceState = {
      "v1|123456789|0": {
        lastPrice: 84.5,
        currency: "EUR",
        lastCheckedIso: "2026-01-01T00:00:00.000Z",
        lastPriceBase: 92.13,
        baseCurrency: "USD",
      },
    };

    writeState(statePath, state);
    const result = readState(statePath);

    expect(result).toEqual(state);
  });

  it("throws a clear, actionable error instead of a raw SyntaxError when the state file is corrupted", () => {
    const statePath = join(dir, "state.json");
    writeFileSync(statePath, "{ this is not valid json", "utf-8");

    expect(() => readState(statePath)).toThrow(/State file.*not valid JSON/);
  });
});
