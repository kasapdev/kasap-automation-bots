import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import { tcpPing } from "../src/tcpCheck.js";

describe("tcpPing", () => {
  it("resolves ok:true with a numeric latencyMs when the host is up", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected an AddressInfo from the listening server");
    }

    try {
      const result = await tcpPing("127.0.0.1", address.port, 2000);
      expect(result.ok).toBe(true);
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    } finally {
      server.close();
    }
  });

  it("resolves ok:false when the target port refuses the connection", async () => {
    // Listen on an ephemeral port then close it immediately: the OS reliably responds
    // with ECONNREFUSED for a just-closed local port, no special permissions needed.
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected an AddressInfo from the listening server");
    }
    const closedPort = address.port;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const result = await tcpPing("127.0.0.1", closedPort, 2000);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.latencyMs).toBeUndefined();
  });

  it("resolves ok:false, error:'timeout' when the connection attempt hangs", async () => {
    // 192.0.2.0/24 is reserved for documentation (RFC 5737, "TEST-NET-1") and is never
    // routable, so a connection attempt to it neither succeeds nor gets refused - it
    // just hangs until our own timeout fires. This gives a deterministic timeout test
    // without depending on flaky external network behavior.
    const result = await tcpPing("192.0.2.1", 9, 200);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("timeout");
  }, 5000);
});
