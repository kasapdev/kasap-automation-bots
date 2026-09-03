import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { checkSslExpiry } from "../src/sslCheck.js";
import type { TlsConnectFn } from "../src/sslCheck.js";

/** Builds a fake TLS socket good enough for checkSslExpiry's needs. */
function makeFakeSocket(certValidTo: string | undefined): EventEmitter & {
  getPeerCertificate: () => { valid_to?: string };
  end: () => void;
  setTimeout: (ms: number, cb?: () => void) => void;
} {
  const emitter = new EventEmitter() as EventEmitter & {
    getPeerCertificate: () => { valid_to?: string };
    end: () => void;
    setTimeout: (ms: number, cb?: () => void) => void;
  };
  emitter.getPeerCertificate = () => (certValidTo ? { valid_to: certValidTo } : {});
  emitter.end = vi.fn();
  emitter.setTimeout = vi.fn();
  return emitter;
}

describe("checkSslExpiry", () => {
  it("resolves with the parsed peer certificate expiry date", async () => {
    const socket = makeFakeSocket("Mar 15 04:00:00 2027 GMT");
    const connectFn: TlsConnectFn = (_port, _host, _options, callback) => {
      queueMicrotask(() => {
        callback();
        socket.emit("secureConnect");
      });
      return socket as never;
    };

    const result = await checkSslExpiry("example.com", 443, connectFn);

    expect(result.toISOString()).toBe(new Date("Mar 15 04:00:00 2027 GMT").toISOString());
    expect(socket.end).toHaveBeenCalled();
  });

  it("closes the socket after reading the certificate", async () => {
    // Real tls sockets only ever invoke the secureConnect callback
    // asynchronously (a handshake requires a network round trip), so the
    // mock defers it too, via queueMicrotask, to match realistic behavior.
    const socket = makeFakeSocket("Jan 1 00:00:00 2030 GMT");
    const connectFn: TlsConnectFn = (_port, _host, _options, callback) => {
      queueMicrotask(() => callback());
      return socket as never;
    };

    await checkSslExpiry("example.com", 443, connectFn);

    expect(socket.end).toHaveBeenCalledTimes(1);
  });

  it("rejects when the socket emits an error", async () => {
    const socket = makeFakeSocket(undefined);
    const connectFn: TlsConnectFn = (_port, _host, _options, _callback) => {
      queueMicrotask(() => {
        socket.emit("error", new Error("connection refused"));
      });
      return socket as never;
    };

    await expect(checkSslExpiry("example.com", 443, connectFn)).rejects.toThrow("connection refused");
  });

  it("rejects when the certificate has no valid_to field", async () => {
    const socket = makeFakeSocket(undefined);
    const connectFn: TlsConnectFn = (_port, _host, _options, callback) => {
      queueMicrotask(() => callback());
      return socket as never;
    };

    await expect(checkSslExpiry("example.com", 443, connectFn)).rejects.toThrow(/No certificate/);
  });
});
