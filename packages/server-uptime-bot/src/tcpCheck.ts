import { Socket } from "node:net";

export interface TcpPingResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Attempts a raw TCP connection to `host:port`, resolving with a result object.
 * Never rejects/throws - all failure modes (connection error, timeout) resolve
 * with `ok: false`. Always destroys the socket before resolving so the process
 * can exit cleanly (no dangling handles).
 */
export function tcpPing(host: string, port: number, timeoutMs: number): Promise<TcpPingResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const startedAt = Date.now();
    let settled = false;

    const finish = (result: TcpPingResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      finish({ ok: true, latencyMs: Date.now() - startedAt });
    });

    socket.once("timeout", () => {
      finish({ ok: false, error: "timeout" });
    });

    socket.once("error", (err: Error) => {
      finish({ ok: false, error: err.message });
    });

    socket.connect(port, host);
  });
}
