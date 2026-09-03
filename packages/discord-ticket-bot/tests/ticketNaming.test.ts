import { describe, expect, it } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import { buildTicketChannelName, buildTicketPermissionOverwrites } from "../src/ticketNaming.js";

describe("buildTicketChannelName", () => {
  it("builds a simple name for a normal username", () => {
    expect(buildTicketChannelName("kayra", 1)).toBe("ticket-kayra-1");
  });

  it("sanitizes spaces, emoji, uppercase and unicode characters", () => {
    const name = buildTicketChannelName("Kayra Kasapoğlu 🚀", 42);
    expect(name).toMatch(/^ticket-[a-z0-9-]+-42$/);
    expect(name).not.toMatch(/[^a-z0-9-]/);
  });

  it("collapses repeated separators", () => {
    const name = buildTicketChannelName("a---b   c", 3);
    expect(name).toBe("ticket-a-b-c-3");
  });

  it("truncates a very long username to a reasonable length", () => {
    const longName = "a".repeat(100);
    const name = buildTicketChannelName(longName, 7);
    // "ticket-" + up to 20 sanitized chars + "-7"
    expect(name.length).toBeLessThanOrEqual("ticket-".length + 20 + "-7".length);
    expect(name.startsWith("ticket-aaaaaaaaaaaaaaaaaaaa")).toBe(true);
    expect(name.endsWith("-7")).toBe(true);
  });

  it("falls back to a default label when nothing sanitizable remains", () => {
    expect(buildTicketChannelName("🚀🚀🚀", 5)).toBe("ticket-kullanici-5");
  });
});

describe("buildTicketPermissionOverwrites", () => {
  it("denies @everyone and allows the ticket opener and the bot, without a staff role", () => {
    const overwrites = buildTicketPermissionOverwrites("guild-1", "user-1", undefined, "bot-1");

    expect(overwrites).toHaveLength(3);

    const everyone = overwrites.find((o) => o.id === "guild-1");
    expect(everyone?.deny).toContain(PermissionFlagsBits.ViewChannel);
    expect(everyone?.allow).toHaveLength(0);

    const user = overwrites.find((o) => o.id === "user-1");
    expect(user?.allow).toEqual(
      expect.arrayContaining([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ]),
    );
    expect(user?.deny).toHaveLength(0);

    const bot = overwrites.find((o) => o.id === "bot-1");
    expect(bot?.allow).toEqual(
      expect.arrayContaining([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ]),
    );

    expect(overwrites.some((o) => o.id === "staff-role-1")).toBe(false);
  });

  it("also allows the staff role when one is configured", () => {
    const overwrites = buildTicketPermissionOverwrites(
      "guild-1",
      "user-1",
      "staff-role-1",
      "bot-1",
    );

    expect(overwrites).toHaveLength(4);
    const staff = overwrites.find((o) => o.id === "staff-role-1");
    expect(staff?.allow).toEqual(
      expect.arrayContaining([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ]),
    );
    expect(staff?.deny).toHaveLength(0);
  });
});
