import path from "node:path";
import type { FileCategory } from "../types/config.js";
import type {
  BundleInsights,
  CompressionRatioStats,
  FileEntry,
  Summary,
} from "../types/report.js";

const EMPTY_BYTES_THRESHOLD = 20;
const TOP_LEVEL_FOLDER_LIMIT = 15;
const EMPTY_PATH_SAMPLE = 40;

/**
 * @param nums - Unsorted numeric samples.
 * @returns Median value, or `null` when empty.
 */
function median(nums: number[]): number | null {
  if (nums.length === 0) {
    return null;
  }
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * @param nums - Numeric samples (any order).
 * @returns Arithmetic mean, or `null` when empty.
 */
function mean(nums: number[]): number | null {
  if (nums.length === 0) {
    return null;
  }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * @param f - Indexed file row.
 * @returns True when the row represents a source map artifact.
 */
function isSourceMapFile(f: FileEntry): boolean {
  return f.type === "sourcemap" || f.isSourceMap;
}

/**
 * @param f - Indexed file row.
 * @returns True for non-map JavaScript or CSS deliverables.
 */
function isDeliverableJsCss(f: FileEntry): boolean {
  return !isSourceMapFile(f) && (f.type === "javascript" || f.type === "css");
}

/**
 * @param f - Indexed file row.
 * @returns True when the file is not classified as a source map.
 */
function isNonMapArtifact(f: FileEntry): boolean {
  return !isSourceMapFile(f);
}

/**
 * Median/mean compression ratios (gzip/brotli over raw) for one file type.
 *
 * @param files - All indexed files.
 * @param type - `javascript` or `css` (callers pass supported types).
 * @returns Stats object, or `null` when no measurable ratios exist.
 */
function compressionStatsForType(
  files: FileEntry[],
  type: FileCategory
): CompressionRatioStats | null {
  const candidates = files.filter((f) => f.type === type && f.rawBytes > 0);
  if (candidates.length === 0) {
    return null;
  }
  const gzipRatios: number[] = [];
  const brotRatios: number[] = [];
  for (const f of candidates) {
    if (f.gzipBytes != null && f.gzipBytes >= 0) {
      gzipRatios.push(f.gzipBytes / f.rawBytes);
    }
    if (f.brotliBytes != null && f.brotliBytes >= 0) {
      brotRatios.push(f.brotliBytes / f.rawBytes);
    }
  }
  if (gzipRatios.length === 0 && brotRatios.length === 0) {
    return null;
  }
  return {
    fileCount: candidates.length,
    medianGzipOverRaw: median(gzipRatios),
    meanGzipOverRaw: mean(gzipRatios),
    medianBrotliOverRaw: median(brotRatios),
    meanBrotliOverRaw: mean(brotRatios),
  };
}

/**
 * Derives higher-level signals (maps footprint, concentration, name hashes, etc.).
 *
 * @param files - Indexed build artifacts.
 * @param summary - Precomputed totals used for percentages.
 * @returns Structured insight object for HTML/JSON.
 */
export function buildInsights(files: FileEntry[], summary: Summary): BundleInsights {
  const totalRaw = summary.totalRawBytes || 0;
  const totalFiles = summary.totalFiles || 0;
  const safeTotalRaw = totalRaw > 0 ? totalRaw : 1;
  const safeTotalFiles = totalFiles > 0 ? totalFiles : 1;

  let smCount = 0;
  let smBytes = 0;
  let deliverJsCssCount = 0;
  let deliverJsCssBytes = 0;
  let jsRawTotal = 0;

  for (const f of files) {
    if (isSourceMapFile(f)) {
      smCount += 1;
      smBytes += f.rawBytes;
    }
    if (isDeliverableJsCss(f)) {
      deliverJsCssCount += 1;
      deliverJsCssBytes += f.rawBytes;
    }
    if (f.type === "javascript" && !isSourceMapFile(f)) {
      jsRawTotal += f.rawBytes;
    }
  }

  let largest: FileEntry | null = null;
  for (const f of files) {
    if (!largest || f.rawBytes > largest.rawBytes) {
      largest = f;
    }
  }

  const largestPath = largest && largest.rawBytes > 0 ? largest.path : null;
  const largestBytes = largest?.rawBytes ?? 0;
  const largestPct =
    totalRaw > 0 && largestBytes > 0 ? (largestBytes / totalRaw) * 100 : 0;

  const emptyPaths: string[] = [];
  for (const f of files) {
    if (f.rawBytes <= EMPTY_BYTES_THRESHOLD) {
      emptyPaths.push(f.path);
    }
  }
  emptyPaths.sort((a, b) => a.localeCompare(b));

  const folderMap = new Map<string, { count: number; bytes: number }>();
  for (const f of files) {
    const norm = f.path.replace(/\\/g, "/");
    const slash = norm.indexOf("/");
    const folder = slash === -1 ? "(root)" : norm.slice(0, slash);
    const cur = folderMap.get(folder) ?? { count: 0, bytes: 0 };
    cur.count += 1;
    cur.bytes += f.rawBytes;
    folderMap.set(folder, cur);
  }
  const topLevelFolders = [...folderMap.entries()]
    .map(([folder, v]) => ({
      folder,
      fileCount: v.count,
      totalRawBytes: v.bytes,
      percentOfTotalRawBytes: (v.bytes / safeTotalRaw) * 100,
    }))
    .sort((a, b) => b.totalRawBytes - a.totalRawBytes)
    .slice(0, TOP_LEVEL_FOLDER_LIMIT);

  const smShareRaw = (smBytes / safeTotalRaw) * 100;
  const productionMapsTriggered =
    smCount >= 2 &&
    smShareRaw >= 1 &&
    jsRawTotal >= 30_000;
  const productionMapsReason = productionMapsTriggered
    ? "Several source maps are present alongside a sizeable JavaScript output. Confirm whether .map files should ship to production."
    : "";

  let withHash = 0;
  let withoutHash = 0;
  const baseCount = new Map<string, number>();
  for (const f of files) {
    if (!isNonMapArtifact(f)) {
      continue;
    }
    if (f.nameHash) {
      withHash += 1;
    } else {
      withoutHash += 1;
    }
    const base = path.basename(f.path.replace(/\\/g, "/"));
    baseCount.set(base, (baseCount.get(base) ?? 0) + 1);
  }
  let duplicateBasenameFileCount = 0;
  for (const c of baseCount.values()) {
    if (c > 1) {
      duplicateBasenameFileCount += c;
    }
  }

  return {
    sourceMaps: {
      sourceMapFileCount: smCount,
      sourceMapRawBytes: smBytes,
      deliverableJsCssFileCount: deliverJsCssCount,
      deliverableJsCssRawBytes: deliverJsCssBytes,
      percentOfTotalRawBytesInSourceMaps: (smBytes / safeTotalRaw) * 100,
      percentOfFilesThatAreSourceMaps: (smCount / safeTotalFiles) * 100,
    },
    concentration: {
      largestFilePath: largestPath,
      largestFileRawBytes: largestBytes,
      largestFilePercentOfTotalRaw: largestPct,
    },
    compressionRatios: {
      javascript: compressionStatsForType(files, "javascript"),
      css: compressionStatsForType(files, "css"),
    },
    emptyFiles: {
      thresholdBytes: EMPTY_BYTES_THRESHOLD,
      count: emptyPaths.length,
      samplePaths: emptyPaths.slice(0, EMPTY_PATH_SAMPLE),
    },
    topLevelFolders,
    productionMaps: {
      triggered: productionMapsTriggered,
      reason: productionMapsReason,
    },
    nameHash: {
      withContentHashCount: withHash,
      withoutContentHashCount: withoutHash,
      duplicateBasenameFileCount,
    },
  };
}
