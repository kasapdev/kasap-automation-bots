export interface PriceDiffResult {
  /** True only when there was a previous price and the current price is lower. */
  dropped: boolean;
  /** Magnitude of the change (always >= 0), regardless of direction. */
  deltaAbs: number;
  /** Magnitude of the change as a percentage of the previous price; null if there was no previous price. */
  deltaPct: number | null;
}

/**
 * Pure comparison between a previous and current price. Does no I/O.
 */
export function diffPrice(previous: number | undefined, current: number): PriceDiffResult {
  if (previous === undefined) {
    return { dropped: false, deltaAbs: 0, deltaPct: null };
  }

  const deltaAbs = Math.abs(current - previous);
  const deltaPct = previous === 0 ? null : (deltaAbs / previous) * 100;
  const dropped = current < previous;

  return { dropped, deltaAbs, deltaPct };
}
