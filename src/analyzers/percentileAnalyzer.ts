import type {
  Distributions,
  FileEntry,
  PercentileSet,
  Percentiles,
} from "../types/report.js";
import { filesInDistributionSlice } from "./distributionAnalyzer.js";

/**
 * Nearest-rank percentile on a pre-sorted ascending array.
 *
 * @param sortedAsc - Byte sizes sorted ascending.
 * @param p - Percentile in `[0, 100]`.
 * @returns Estimated percentile value (0 when empty).
 */
function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0]!;
  const idx = Math.floor((p / 100) * (n - 1));
  return sortedAsc[idx]!;
}

/**
 * @param bytes - Raw byte sizes (any order).
 * @returns p50–p99 tuple for that sample.
 */
function buildSet(bytes: number[]): PercentileSet {
  if (bytes.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...bytes].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * @param files - Indexed files in a slice.
 * @returns Their raw byte sizes.
 */
function rawBytesList(files: FileEntry[]): number[] {
  return files.map((f) => f.rawBytes);
}

/**
 * Raw-byte percentiles (p50–p99) per distribution slice.
 *
 * @param files - Indexed build artifacts.
 * @returns Percentile sets keyed like `Distributions`.
 */
export function buildPercentiles(files: FileEntry[]): Percentiles {
  const keys: (keyof Distributions)[] = [
    "all",
    "javascript",
    "css",
    "image",
    "font",
    "sourcemap",
    "other",
  ];
  const out = {} as Percentiles;
  for (const k of keys) {
    const slice = filesInDistributionSlice(files, k);
    out[k] = buildSet(rawBytesList(slice));
  }
  return out;
}
