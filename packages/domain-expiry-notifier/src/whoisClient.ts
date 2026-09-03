import { Socket } from "node:net";

/**
 * Known WHOIS servers for common TLDs. This is not exhaustive - it covers a
 * useful default set. Extend this map as needed for additional TLDs; domains
 * whose TLD is not listed here fall back to `whois.iana.org`, which returns a
 * referral response pointing at the authoritative server (it will not contain
 * expiry data directly).
 */
export const TLD_WHOIS_SERVERS: Record<string, string> = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.pir.org",
  io: "whois.nic.io",
  dev: "whois.nic.google",
  app: "whois.nic.google",
  info: "whois.afilias.net",
  co: "whois.nic.co",
  default: "whois.iana.org",
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Opens a raw TCP connection to a WHOIS server, sends the query, and
 * resolves with the full text response once the server closes the
 * connection. Rejects on socket error or timeout.
 */
export function queryWhois(
  server: string,
  query: string,
  port = 43,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: Error): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs);

    socket.on("timeout", () => {
      fail(new Error(`WHOIS query to ${server}:${port} timed out after ${timeoutMs}ms`));
    });

    socket.on("error", (err) => {
      fail(err instanceof Error ? err : new Error(String(err)));
    });

    socket.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    socket.on("close", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    socket.connect(port, server, () => {
      socket.write(`${query}\r\n`);
    });
  });
}

/**
 * Picks a WHOIS server for the given domain based on its TLD, queries it,
 * and returns the raw response text. Accepts an injectable `queryFn` so
 * tests can supply canned responses without opening a real socket.
 */
export async function lookupDomain(
  domain: string,
  queryFn: (server: string, query: string, port?: number) => Promise<string> = queryWhois
): Promise<string> {
  const server = whoisServerForDomain(domain);
  return queryFn(server, domain);
}

/** Resolves the WHOIS server to use for a domain, based on its TLD. */
export function whoisServerForDomain(domain: string): string {
  const tld = domain.trim().toLowerCase().split(".").pop() ?? "";
  return TLD_WHOIS_SERVERS[tld] ?? TLD_WHOIS_SERVERS["default"]!;
}
