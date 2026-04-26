import type { FileCategory } from "../types/config.js";
import type { ByTypeEntry, FileEntry, Summary } from "../types/report.js";

const ALL_TYPES: FileCategory[] = [
  "javascript",
  "css",
  "image",
  "font",
  "sourcemap",
  "html",
  "json",
  "wasm",
  "media",
  "other",
];

/**
 * Aggregates totals and per-type rollups for indexed files.
 *
 * @param files - Indexed build artifacts.
 * @returns Totals and `byType` rollups.
 */
export function buildSummary(files: FileEntry[]): Summary {
  const totalFiles = files.length;
  let totalRawBytes = 0;
  let totalGzipBytes = 0;
  let totalBrotliBytes = 0;

  const agg = new Map<
    FileCategory,
    { count: number; raw: number; gzip: number; brotli: number }
  >();
  for (const t of ALL_TYPES) {
    agg.set(t, { count: 0, raw: 0, gzip: 0, brotli: 0 });
  }

  for (const f of files) {
    totalRawBytes += f.rawBytes;
    if (f.gzipBytes !== null) totalGzipBytes += f.gzipBytes;
    if (f.brotliBytes !== null) totalBrotliBytes += f.brotliBytes;
    const a = agg.get(f.type);
    if (a) {
      a.count += 1;
      a.raw += f.rawBytes;
      if (f.gzipBytes !== null) a.gzip += f.gzipBytes;
      if (f.brotliBytes !== null) a.brotli += f.brotliBytes;
    }
  }

  const byType: ByTypeEntry[] = [];
  for (const t of ALL_TYPES) {
    const a = agg.get(t)!;
    if (a.count === 0 && a.raw === 0) continue;
    byType.push({
      type: t,
      count: a.count,
      totalRawBytes: a.raw,
      totalGzipBytes: a.gzip,
      totalBrotliBytes: a.brotli,
      percentOfFiles: totalFiles ? (a.count / totalFiles) * 100 : 0,
      percentOfRawBytes: totalRawBytes ? (a.raw / totalRawBytes) * 100 : 0,
    });
  }

  return {
    totalFiles,
    totalRawBytes,
    totalGzipBytes,
    totalBrotliBytes,
    byType,
  };
}
