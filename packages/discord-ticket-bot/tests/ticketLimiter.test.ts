import { describe, expect, it } from "vitest";
import { canOpenTicket, createInMemoryTicketStore } from "../src/ticketLimiter.js";

describe("createInMemoryTicketStore", () => {
  it("starts every user at zero open tickets", () => {
    const store = createInMemoryTicketStore();
    expect(store.getOpenCount("user-1")).toBe(0);
  });

  it("increments and decrements a user's count", () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    store.increment("user-1");
    expect(store.getOpenCount("user-1")).toBe(2);

    store.decrement("user-1");
    expect(store.getOpenCount("user-1")).toBe(1);
  });

  it("does not go below zero", () => {
    const store = createInMemoryTicketStore();
    store.decrement("user-1");
    expect(store.getOpenCount("user-1")).toBe(0);
  });

  it("tracks independent users separately", () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    store.increment("user-2");
    store.increment("user-2");

    expect(store.getOpenCount("user-1")).toBe(1);
    expect(store.getOpenCount("user-2")).toBe(2);
  });
});

describe("canOpenTicket", () => {
  it("returns true when under the limit", () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    expect(canOpenTicket("user-1", store, 2)).toBe(true);
  });

  it("returns false when at the limit", () => {
    const store = createInMemoryTicketStore();
    store.increment("user-1");
    expect(canOpenTicket("user-1", store, 1)).toBe(false);
  });

  it("reflects increments and decrements", () => {
    const store = createInMemoryTicketStore();
    expect(canOpenTicket("user-1", store, 1)).toBe(true);
    store.increment("user-1");
    expect(canOpenTicket("user-1", store, 1)).toBe(false);
    store.decrement("user-1");
    expect(canOpenTicket("user-1", store, 1)).toBe(true);
  });
});
