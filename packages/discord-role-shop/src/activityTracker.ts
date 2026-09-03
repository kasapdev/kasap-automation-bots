/**
 * Decides how many points a message earns given the cooldown state.
 * Pure function: no DB access, easy to unit test in isolation.
 *
 * @param now current time
 * @param lastEarnedAtIso ISO timestamp of the last time this user earned points in this
 *   guild, or null if they never have
 * @param pointsPerMessage points to award when not on cooldown
 * @param cooldownMs minimum time between point-earning messages
 */
export function computeEarnedPoints(
  now: Date,
  lastEarnedAtIso: string | null,
  pointsPerMessage: number,
  cooldownMs: number,
): number {
  if (lastEarnedAtIso === null) {
    return pointsPerMessage;
  }

  const elapsed = now.getTime() - new Date(lastEarnedAtIso).getTime();
  if (elapsed >= cooldownMs) {
    return pointsPerMessage;
  }

  return 0;
}
