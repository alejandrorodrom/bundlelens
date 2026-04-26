import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { FileEntry } from "../types/report.js";
import type { FileCategory, ResolvedCompression } from "../types/config.js";
import { measureCompression } from "../utils/compression.js";
import {
  classifyFile,
  detectNameHash,
  relatedPathsForFile,
} from "../utils/fileTypes.js";

/** Progress events while discovering, indexing, and measuring files. */
export type CollectFilesProgress =
  | { phase: "discover"; stage: "listing" }
  | { phase: "discover"; stage: "done"; pathCount: number }
  | { phase: "index"; current: number; total: number }
  | { phase: "compress"; current: number; total: number };

/** Counts and small samples for non-fatal read/compression issues. */
export type CollectFilesDiagnostics = {
  discoveredFiles: number;
  indexedFiles: number;
  skippedReadFiles: number;
  compressionReadErrors: number;
  skippedReadSamples: Array<{ path: string; code: string }>;
  compressionReadSamples: Array<{ path: string; code: string }>;
};

/**
 * @param err - Any error from `fs` operations.
 * @returns `err.code` when a string, otherwise `"UNKNOWN"`.
 */
function errnoCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as NodeJS.ErrnoException).code;
    if (typeof c === "string" && c.length > 0) {
      return c;
    }
  }
  return "UNKNOWN";
}

type StagedFile = {
  path: string;
  extension: string;
  type: FileCategory;
  rawBytes: number;
  nameHash: string | null;
  isSourceMap: boolean;
  relatedSourceMap: string | null;
  relatedFile: string | null;
  gzipBytes: number | null;
  brotliBytes: number | null;
};

/**
 * Reads and classifies a single absolute file under the build directory.
 *
 * @param buildDirAbs - Root of the build output tree.
 * @param abs - Absolute path to the file on disk.
 * @param compression - When gzip/brotli are enabled, sizes are measured from the same read buffer.
 * @returns Staged metadata, a read failure marker, or `null` when outside the tree.
 */
async function indexOneFile(
  buildDirAbs: string,
  abs: string,
  compression: ResolvedCompression
): Promise<StagedFile | { failed: true; rel: string; code: string } | null> {
  const rel = path.relative(buildDirAbs, abs).split(path.sep).join("/");
  if (rel === "" || rel.startsWith("..")) return null;

  const { extension, type, isSourceMap } = classifyFile(rel);
  const base = path.basename(rel);
  const nameHash = detectNameHash(base);

  let buf: Buffer;
  try {
    buf = await fs.readFile(abs);
  } catch (e) {
    return { failed: true, rel, code: errnoCode(e) };
  }
  const rawBytes = buf.length;
  const needCompress = Boolean(compression.gzip || compression.brotli);
  let gzipBytes: number | null = null;
  let brotliBytes: number | null = null;
  if (needCompress) {
    const m = measureCompression(buf, compression);
    gzipBytes = m.gzipBytes;
    brotliBytes = m.brotliBytes;
  }

  let relMap = relatedPathsForFile(rel, type, isSourceMap);
  if (relMap.relatedSourceMap) {
    const mapAbs = path.join(buildDirAbs, relMap.relatedSourceMap);
    try {
      await fs.access(mapAbs);
    } catch {
      relMap = { ...relMap, relatedSourceMap: null };
    }
  }
  if (relMap.relatedFile) {
    const fileAbs = path.join(buildDirAbs, relMap.relatedFile);
    try {
      await fs.access(fileAbs);
    } catch {
      relMap = { ...relMap, relatedFile: null };
    }
  }

  return {
    path: rel,
    extension,
    type,
    rawBytes,
    nameHash,
    isSourceMap,
    relatedSourceMap: relMap.relatedSourceMap,
    relatedFile: relMap.relatedFile,
    gzipBytes,
    brotliBytes,
  };
}

/**
 * Recursively lists files under `buildDirAbs`, measures sizes, and optionally gzip/brotli.
 *
 * @param buildDirAbs - Absolute build output directory.
 * @param compression - Which compressed sizes to compute per file.
 * @param onProgress - Optional coarse-grained progress callback.
 * @returns File entries plus diagnostics for skipped reads / compression errors.
 */
export async function collectFiles(
  buildDirAbs: string,
  compression: ResolvedCompression,
  onProgress?: (p: CollectFilesProgress) => void
): Promise<{ entries: FileEntry[]; diagnostics: CollectFilesDiagnostics }> {
  onProgress?.({ phase: "discover", stage: "listing" });

  const paths = await fg("**/*", {
    cwd: buildDirAbs,
    onlyFiles: true,
    dot: true,
    absolute: true,
    followSymbolicLinks: true,
  });

  onProgress?.({ phase: "discover", stage: "done", pathCount: paths.length });

  let skippedReadFiles = 0;
  const skippedReadSamples: Array<{ path: string; code: string }> = [];

  if (paths.length === 0) {
    return {
      entries: [],
      diagnostics: {
        discoveredFiles: 0,
        indexedFiles: 0,
        skippedReadFiles: 0,
        compressionReadErrors: 0,
        skippedReadSamples: [],
        compressionReadSamples: [],
      },
    };
  }

  const entries: FileEntry[] = [];
  const needCompress = Boolean(compression.gzip || compression.brotli);
  const total = paths.length;
  const emitProgress = (current: number): void => {
    onProgress?.({ phase: "index", current, total });
    if (needCompress) onProgress?.({ phase: "compress", current, total });
  };

  for (let i = 0; i < paths.length; i++) {
    const abs = paths[i]!;
    const row = await indexOneFile(buildDirAbs, abs, compression);
    if (!row) {
      emitProgress(i + 1);
      continue;
    }

    if ("failed" in row) {
      skippedReadFiles += 1;
      if (skippedReadSamples.length < 5) {
        skippedReadSamples.push({ path: row.rel, code: row.code });
      }
      emitProgress(i + 1);
      continue;
    }

    entries.push({
      path: row.path,
      extension: row.extension,
      type: row.type,
      rawBytes: row.rawBytes,
      gzipBytes: row.gzipBytes,
      brotliBytes: row.brotliBytes,
      nameHash: row.nameHash,
      isSourceMap: row.isSourceMap,
      relatedSourceMap: row.relatedSourceMap,
      relatedFile: row.relatedFile,
    });
    emitProgress(i + 1);
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    entries,
    diagnostics: {
      discoveredFiles: paths.length,
      indexedFiles: entries.length,
      skippedReadFiles,
      compressionReadErrors: 0,
      skippedReadSamples,
      compressionReadSamples: [],
    },
  };
}
