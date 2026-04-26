const THREE_MIN_MS = 3 * 60 * 1000;

/**
 * Human-readable duration: ms, seconds (≤3 min), or `Xm Ys` for longer spans.
 *
 * @param ms - Duration in milliseconds (coerced to non-negative integer).
 * @returns Compact duration string.
 */
export function formatDurationHuman(ms: number): string {
  const n = Math.max(0, Math.round(Number(ms) || 0));
  if (n < 1000) {
    return `${n} ms`;
  }
  if (n <= THREE_MIN_MS) {
    const sec = n / 1000;
    return sec < 10 ? `${sec.toFixed(2)} s` : `${sec.toFixed(1)} s`;
  }
  const totalSec = Math.floor(n / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs}s`;
}
