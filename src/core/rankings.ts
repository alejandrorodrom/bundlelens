import type { FileEntry, RankingItem, Rankings } from "../types/report.js";

/**
 * @param items - Path/byte pairs to rank (mutated in place).
 * @returns Same array reference, sorted descending by `bytes` (stable for ties).
 */
function sortByBytes(items: RankingItem[]): RankingItem[] {
  items.sort((a, b) => b.bytes - a.bytes);
  return items;
}

const ASSET_TYPES = new Set<string>([
  "javascript",
  "css",
  "image",
  "font",
  "wasm",
  "media",
  "html",
  "json",
  "other",
]);

/**
 * Builds sorted ranking tables from indexed file entries.
 *
 * @param files - Indexed build artifacts.
 * @returns Precomputed ranking tables for the HTML report.
 */
export function buildRankings(files: FileEntry[]): Rankings {
  const filesByRawBytes: RankingItem[] = [];
  const filesByGzipBytes: RankingItem[] = [];
  const filesByBrotliBytes: RankingItem[] = [];
  const javascriptByRawBytes: RankingItem[] = [];
  const cssByRawBytes: RankingItem[] = [];
  const assetsByRawBytes: RankingItem[] = [];
  const sourceMapsByRawBytes: RankingItem[] = [];

  for (const f of files) {
    const filePath = f.path;
    const raw = f.rawBytes;
    filesByRawBytes.push({ path: filePath, bytes: raw });
    filesByGzipBytes.push({ path: filePath, bytes: f.gzipBytes ?? 0 });
    filesByBrotliBytes.push({ path: filePath, bytes: f.brotliBytes ?? 0 });
    if (f.type === "javascript") {
      javascriptByRawBytes.push({ path: filePath, bytes: raw });
    } else if (f.type === "css") {
      cssByRawBytes.push({ path: filePath, bytes: raw });
    }
    if (ASSET_TYPES.has(f.type)) {
      assetsByRawBytes.push({ path: filePath, bytes: raw });
    }
    if (f.type === "sourcemap") {
      sourceMapsByRawBytes.push({ path: filePath, bytes: raw });
    }
  }

  sortByBytes(filesByRawBytes);
  sortByBytes(filesByGzipBytes);
  sortByBytes(filesByBrotliBytes);
  sortByBytes(javascriptByRawBytes);
  sortByBytes(cssByRawBytes);
  sortByBytes(assetsByRawBytes);
  sortByBytes(sourceMapsByRawBytes);

  return {
    filesByRawBytes,
    filesByGzipBytes,
    filesByBrotliBytes,
    javascriptByRawBytes,
    cssByRawBytes,
    assetsByRawBytes,
    sourceMapsByRawBytes,
  };
}
