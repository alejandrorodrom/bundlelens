import fs from "node:fs/promises";
import os from "node:os";
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
import { nodeErrnoCode } from "../utils/nodeErrno.js";

/** Progress events while discovering, indexing, and measuring files. */
export type CollectFilesProgress =
  | { phase: "discover"; stage: "listing" }
  | { phase: "discover"; stage: "done"; pathCount: number }
  | { phase: "index"; current: number; total: number }
  | { phase: "compress"; current: number; total: number };

/** Counts and small samples for non-fatal read issues during indexing. */
export type CollectFilesDiagnostics = {
  discoveredFiles: number;
  indexedFiles: number;
  skippedReadFiles: number;
  skippedReadSamples: Array<{ path: string; code: string }>;
};

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

type IndexOutcome =
  | StagedFile
  | { failed: true; rel: string; code: string }
  | null;

/**
 * Parallel `readFile` workers: bounded by RAM (few large buffers at once) and disk throughput.
 * Clamped to [8, 32] as a practical default for huge `dist/` trees.
 */
function indexingConcurrency(): number {
  const logical =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : Math.max(1, os.cpus().length);
  return Math.min(32, Math.max(8, logical));
}

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
    return { failed: true, rel, code: nodeErrnoCode(e) ?? "UNKNOWN" };
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
 * @param onProgress - Optional progress callback. During index/compress, `current` is the number of
 *   files **finished** so far (monotonic); completion order may differ from listing order when
 *   multiple files are read in parallel.
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
        skippedReadSamples: [],
      },
    };
  }

  const entries: FileEntry[] = [];
  const needCompress = Boolean(compression.gzip || compression.brotli);
  const total = paths.length;
  const emitProgress = (current: number): void => {
    onProgress?.(
      needCompress
        ? { phase: "compress", current, total }
        : { phase: "index", current, total }
    );
  };

  const outcomes: IndexOutcome[] = new Array(paths.length);
  let nextSlot = 0;
  let finished = 0;

  const runWorker = async (): Promise<void> => {
    for (;;) {
      const i = nextSlot++;
      if (i >= paths.length) return;
      const abs = paths[i]!;
      outcomes[i] = await indexOneFile(buildDirAbs, abs, compression);
      finished += 1;
      emitProgress(finished);
    }
  };

  const workers = Math.min(indexingConcurrency(), paths.length);
  await Promise.all(Array.from({ length: workers }, () => runWorker()));

  for (let i = 0; i < paths.length; i++) {
    const row = outcomes[i]!;
    if (!row) {
      continue;
    }
    if ("failed" in row) {
      skippedReadFiles += 1;
      if (skippedReadSamples.length < 5) {
        skippedReadSamples.push({ path: row.rel, code: row.code });
      }
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
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    entries,
    diagnostics: {
      discoveredFiles: paths.length,
      indexedFiles: entries.length,
      skippedReadFiles,
      skippedReadSamples,
    },
  };
}
