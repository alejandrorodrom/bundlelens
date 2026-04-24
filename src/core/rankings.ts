import type { FileEntry, RankingItem, Rankings } from "../types/report.js";

function sortByBytes(
  items: { path: string; bytes: number }[]
): RankingItem[] {
  return [...items].sort((a, b) => b.bytes - a.bytes);
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

export function buildRankings(files: FileEntry[]): Rankings {
  const filesByRawBytes = sortByBytes(
    files.map((f) => ({ path: f.path, bytes: f.rawBytes }))
  );
  const filesByGzipBytes = sortByBytes(
    files.map((f) => ({ path: f.path, bytes: f.gzipBytes ?? 0 }))
  );
  const filesByBrotliBytes = sortByBytes(
    files.map((f) => ({ path: f.path, bytes: f.brotliBytes ?? 0 }))
  );
  const javascriptByRawBytes = sortByBytes(
    files
      .filter((f) => f.type === "javascript")
      .map((f) => ({ path: f.path, bytes: f.rawBytes }))
  );
  const cssByRawBytes = sortByBytes(
    files
      .filter((f) => f.type === "css")
      .map((f) => ({ path: f.path, bytes: f.rawBytes }))
  );
  const assetsByRawBytes = sortByBytes(
    files
      .filter((f) => ASSET_TYPES.has(f.type))
      .map((f) => ({ path: f.path, bytes: f.rawBytes }))
  );
  const sourceMapsByRawBytes = sortByBytes(
    files
      .filter((f) => f.type === "sourcemap")
      .map((f) => ({ path: f.path, bytes: f.rawBytes }))
  );

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
