const KB = 1024;

/**
 * Formats a byte length using binary units (KiB, MiB, …).
 *
 * @param n - Non-negative byte length.
 * @returns Human-readable size string.
 */
export function formatBytes(n: number): string {
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= KB && i < units.length - 1) {
    v /= KB;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(2) : v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Maps a raw byte size to the fixed histogram bucket used in distributions.
 *
 * @param rawBytes - File size in bytes.
 * @returns Discrete bucket label.
 */
export function bucketForRawBytes(rawBytes: number): import("../types/report.js").SizeBucket {
  const b = rawBytes;
  const k10 = 10 * KB;
  const k50 = 50 * KB;
  const k100 = 100 * KB;
  const k500 = 500 * KB;
  const m1 = KB * KB;
  if (b < k10) return "0-10kb";
  if (b < k50) return "10-50kb";
  if (b < k100) return "50-100kb";
  if (b < k500) return "100-500kb";
  if (b < m1) return "500kb-1mb";
  return "1mb+";
}
