import * as os from "node:os";

export interface DiskStats {
  freePct: number;
}

export interface SystemStats {
  /** 1-minute load average (os.loadavg()[0]). */
  loadAvg1: number;
  /** Percentage (0-100) of free system memory. */
  freeMemPct: number;
  /** Percentage (0-100) of free disk space, or null when no disk check is wired up. */
  diskFreePct: number | null;
}

/**
 * Default disk-check stub: disk usage is platform-specific (would need to shell out
 * to `df` on Linux/macOS or `wmic logicaldisk` / `Get-PSDrive` on Windows and parse
 * the output), which is out of scope here. A real implementation can be injected via
 * the `diskCheck` parameter later without changing any callers.
 */
async function defaultDiskCheck(): Promise<DiskStats | null> {
  return null;
}

export async function getSystemStats(
  diskCheck: () => Promise<DiskStats | null> = defaultDiskCheck,
): Promise<SystemStats> {
  const loadAvg1 = os.loadavg()[0] ?? 0;
  const freeMemPct = (os.freemem() / os.totalmem()) * 100;
  const disk = await diskCheck();

  return {
    loadAvg1,
    freeMemPct,
    diskFreePct: disk ? disk.freePct : null,
  };
}
