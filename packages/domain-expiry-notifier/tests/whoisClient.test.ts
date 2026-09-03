import { describe, it, expect } from "vitest";
import { createServer } from "node:net";
import { lookupDomain, queryWhois, whoisServerForDomain } from "../src/whoisClient.js";

describe("whoisServerForDomain / lookupDomain", () => {
  it("picks the Verisign server for .com domains", () => {
    expect(whoisServerForDomain("example.com")).toBe("whois.verisign-grs.com");
  });

  it("picks the Verisign server for .net domains", () => {
    expect(whoisServerForDomain("example.net")).toBe("whois.verisign-grs.com");
  });

  it("picks the PIR server for .org domains", () => {
    expect(whoisServerForDomain("example.org")).toBe("whois.pir.org");
  });

  it("picks whois.nic.io for .io domains", () => {
    expect(whoisServerForDomain("example.io")).toBe("whois.nic.io");
  });

  it("picks whois.nic.google for .dev and .app domains", () => {
    expect(whoisServerForDomain("example.dev")).toBe("whois.nic.google");
    expect(whoisServerForDomain("example.app")).toBe("whois.nic.google");
  });

  it("falls back to whois.iana.org for an unknown TLD", () => {
    expect(whoisServerForDomain("example.xyzunknown")).toBe("whois.iana.org");
  });

  it("is case-insensitive on the TLD", () => {
    expect(whoisServerForDomain("EXAMPLE.COM")).toBe("whois.verisign-grs.com");
  });

  it("lookupDomain queries the server chosen for the domain's TLD, using the injected queryFn", async () => {
    const calls: Array<{ server: string; query: string }> = [];
    const fakeQueryFn = async (server: string, query: string): Promise<string> => {
      calls.push({ server, query });
      return "Registry Expiry Date: 2027-01-01T00:00:00Z";
    };

    const result = await lookupDomain("example.com", fakeQueryFn);

    expect(calls).toEqual([{ server: "whois.verisign-grs.com", query: "example.com" }]);
    expect(result).toContain("Registry Expiry Date");
  });

  it("lookupDomain falls back to whois.iana.org for an unrecognized TLD", async () => {
    const calls: string[] = [];
    const fakeQueryFn = async (server: string): Promise<string> => {
      calls.push(server);
      return "";
    };

    await lookupDomain("example.unknowntld", fakeQueryFn);

    expect(calls).toEqual(["whois.iana.org"]);
  });
});

describe("queryWhois (real local socket, no external network)", () => {
  it("sends the query and resolves with the server's full response", async () => {
    const server = createServer((socket) => {
      let received = "";
      socket.on("data", (chunk) => {
        received += chunk.toString("utf-8");
        if (received.includes("\r\n")) {
          socket.end(`Registry Expiry Date: 2027-03-15T04:00:00Z\r\nEchoed query: ${received.trim()}`);
        }
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected server to bind to a port");
    }

    try {
      const response = await queryWhois("127.0.0.1", "example.com", address.port);
      expect(response).toContain("Registry Expiry Date: 2027-03-15T04:00:00Z");
      expect(response).toContain("Echoed query: example.com");
    } finally {
      server.close();
    }
  });

  it("rejects when the connection cannot be established", async () => {
    // Port 0 combined with an unroutable-ish immediate refusal: connect to a
    // closed local port to trigger ECONNREFUSED quickly.
    const server = createServer(() => {});
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected server to bind to a port");
    }
    const closedPort = address.port;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await expect(queryWhois("127.0.0.1", "example.com", closedPort, 2000)).rejects.toThrow();
  });
});
