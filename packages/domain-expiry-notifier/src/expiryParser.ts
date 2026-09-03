/**
 * WHOIS output format varies by registry/registrar, so we try several known
 * field-name patterns, in order of how commonly they appear. The first
 * matching line wins.
 */
const EXPIRY_FIELD_PATTERN =
  /^\s*(Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|Expiry Date|paid-till|expire|Domain Expiration Date):\s*(.+)$/im;

/**
 * Parses a domain's expiry date out of raw WHOIS response text.
 * Returns null if no known field is found or the captured value doesn't
 * parse into a valid Date. Pure function - no I/O.
 */
export function parseExpiryDate(whoisRawText: string): Date | null {
  const match = EXPIRY_FIELD_PATTERN.exec(whoisRawText);
  if (!match) return null;

  const rawValue = match[2];
  if (!rawValue) return null;

  const date = new Date(rawValue.trim());
  if (isNaN(date.getTime())) return null;

  return date;
}
