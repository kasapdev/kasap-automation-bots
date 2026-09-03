import * as tls from "node:tls";
import type { TLSSocket, ConnectionOptions } from "node:tls";

/** Minimal shape of tls.connect we depend on, to keep injection/mocking simple. */
export type TlsConnectFn = (
  port: number,
  host: string,
  options: ConnectionOptions,
  callback: () => void
) => TLSSocket;

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Opens a real TLS connection to `host:port` and resolves with the peer
 * certificate's `valid_to` date. Rejects on socket error or timeout.
 * `connectFn` is injectable so tests can supply a fake socket instead of
 * making a real network connection.
 */
export function checkSslExpiry(
  host: string,
  port = 443,
  connectFn: TlsConnectFn = tls.connect as unknown as TlsConnectFn,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Date> {
  return new Promise((resolve, reject) => {
    let settled = false;
    // Declared with `let` (not `const`) and assigned after connectFn returns,
    // because a connectFn implementation (real or mocked) may invoke the
    // secureConnect callback synchronously, before its own return value
    // would otherwise be bound - referencing a `const` at that point would
    // throw a temporal-dead-zone ReferenceError.
    let socket: TLSSocket;

    socket = connectFn(port, host, { servername: host }, () => {
      if (settled) return;
      settled = true;
      try {
        const cert = socket.getPeerCertificate();
        const validTo = cert?.valid_to;
        if (!validTo) {
          reject(new Error(`No certificate returned by ${host}:${port}`));
          return;
        }
        const date = new Date(validTo);
        if (isNaN(date.getTime())) {
          reject(new Error(`Could not parse certificate valid_to for ${host}: ${validTo}`));
          return;
        }
        resolve(date);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        socket.end();
      }
    });

    socket.setTimeout(timeoutMs, () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error(`TLS connection to ${host}:${port} timed out after ${timeoutMs}ms`));
    });

    socket.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
