import { describe, it, expect } from "vitest";
import { parseExpiryDate } from "../src/expiryParser.js";

describe("parseExpiryDate", () => {
  it("parses a Verisign-style 'Registry Expiry Date' field (.com/.net)", () => {
    const whois = `
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.example
Updated Date: 2025-08-14T04:00:00Z
Creation Date: 1995-08-14T04:00:00Z
Registry Expiry Date: 2027-03-15T04:00:00Z
Registrar: Example Registrar, Inc.
`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe("2027-03-15T04:00:00.000Z");
  });

  it("parses a 'Registrar Registration Expiration Date' field", () => {
    const whois = `
   Domain Name: example.org
   Registrar Registration Expiration Date: 2026-11-01T00:00:00Z
   Registrar: Example Registrar
`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("parses a lowercase 'paid-till' field (RU/some ccTLD style)", () => {
    const whois = `
domain: EXAMPLE.RU
nserver: ns1.example.ru
state: REGISTERED, DELEGATED, VERIFIED
org: Example LLC
registrar: EXAMPLE-RU
admin-contact: https://example.com
created: 2010-05-01T00:00:00Z
paid-till: 2026-05-01T00:00:00Z
free-date: 2026-06-01
source: TCI
`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("parses a plain 'Expiry Date' field without a time component", () => {
    const whois = `
Domain Name: example.io
Expiry Date: 2028-01-20
Registrar: Example Registrar
`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.getUTCFullYear()).toBe(2028);
    expect(result?.getUTCMonth()).toBe(0);
    expect(result?.getUTCDate()).toBe(20);
  });

  it("parses a 'Domain Expiration Date' field", () => {
    const whois = `
Domain Name: EXAMPLE.INFO
Domain Expiration Date: Fri Sep 15 04:00:00 GMT 2028
Sponsoring Registrar: Example Registrar
`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.getUTCFullYear()).toBe(2028);
  });

  it("is case-insensitive when matching the field name", () => {
    const whois = `expiration date: 2027-06-01T00:00:00Z\n`;
    const result = parseExpiryDate(whois);
    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe("2027-06-01T00:00:00.000Z");
  });

  it("returns null for a completely unparseable blob", () => {
    const whois = `
This domain is reserved and not available for registration.
Please contact the registry operator for more information.
`;
    expect(parseExpiryDate(whois)).toBeNull();
  });

  it("returns null when the matched value doesn't form a valid date", () => {
    const whois = `Expiry Date: not-a-real-date\n`;
    expect(parseExpiryDate(whois)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseExpiryDate("")).toBeNull();
  });

  it("prefers the first matching pattern when multiple could match", () => {
    const whois = `
Registry Expiry Date: 2027-03-15T04:00:00Z
Registrar Registration Expiration Date: 2027-03-16T04:00:00Z
`;
    const result = parseExpiryDate(whois);
    expect(result?.toISOString()).toBe("2027-03-15T04:00:00.000Z");
  });
});
