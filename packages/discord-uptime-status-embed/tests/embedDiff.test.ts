import { describe, expect, it } from "vitest";
import { buildStatusEmbed } from "../src/embedBuilder.js";
import { embedsEqual } from "../src/embedDiff.js";

describe("embedsEqual", () => {
  it("returns true for identical status when only the timestamp differs", () => {
    const a = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 10 }], "2026-09-04T12:00:00.000Z");
    const b = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 10 }], "2026-09-04T12:01:00.000Z");

    expect(embedsEqual(a, b)).toBe(true);
  });

  it("returns false when a server flips from up to down", () => {
    const a = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 10 }], "2026-09-04T12:00:00.000Z");
    const b = buildStatusEmbed([{ name: "A", ok: false }], "2026-09-04T12:00:00.000Z");

    expect(embedsEqual(a, b)).toBe(false);
  });

  it("returns false when the server count differs", () => {
    const a = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 10 }], "2026-09-04T12:00:00.000Z");
    const b = buildStatusEmbed(
      [
        { name: "A", ok: true, latencyMs: 10 },
        { name: "B", ok: true, latencyMs: 10 },
      ],
      "2026-09-04T12:00:00.000Z",
    );

    expect(embedsEqual(a, b)).toBe(false);
  });

  it("returns false when only the latency number in the value string differs", () => {
    // Deliberate/documented behavior: a latency change alone changes the field's
    // `value` text, so this correctly counts as "not equal" even though `ok` didn't
    // flip. Callers that only care about up/down transitions should compare that
    // separately; this function reports "would a viewer see any visible change".
    const a = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 10 }], "2026-09-04T12:00:00.000Z");
    const b = buildStatusEmbed([{ name: "A", ok: true, latencyMs: 999 }], "2026-09-04T12:00:00.000Z");

    expect(embedsEqual(a, b)).toBe(false);
  });
});
