const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ExpiryStatus {
  /** True when the expiry is within the warning threshold, or already past. */
  warn: boolean;
  /** Whole days remaining until expiry. Negative if already expired. */
  daysRemaining: number;
}

/**
 * Pure function: computes whether `expiryDate` is within `warnDaysThreshold`
 * days of `now`, and how many whole days remain. An already-expired date
 * (negative days remaining) always warns, regardless of the threshold.
 */
export function isExpiringSoon(
  expiryDate: Date,
  warnDaysThreshold: number,
  now: Date
): ExpiryStatus {
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.floor(diffMs / MS_PER_DAY);
  const warn = daysRemaining <= warnDaysThreshold;
  return { warn, daysRemaining };
}
