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

export type CollectFilesProgress =
  | { phase: "discover"; stage: "listing" }
  | { phase: "discover"; stage: "done"; pathCount: number }
  | { phase: "index"; current: number; total: number }
  | { phase: "compress"; current: number; total: number };

export type CollectFilesDiagnostics = {
  discoveredFiles: number;
  indexedFiles: number;
  skippedReadFiles: number;
  compressionReadErrors: number;
  /** Up to 5 relative paths with errno when read failed during indexing. */
  skippedReadSamples: Array<{ path: string; code: string }>;
  /** Up to 5 paths that failed re-read for gzip/brotli. */
  compressionReadSamples: Array<{ path: string; code: string }>;
};

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
  absPath: string;
};

async function indexOneFile(
  buildDirAbs: string,
  abs: string
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
    absPath: abs,
  };
}

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
  let compressionReadErrors = 0;
  const skippedReadSamples: Array<{ path: string; code: string }> = [];
  const compressionReadSamples: Array<{ path: string; code: string }> = [];

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

  const staged: StagedFile[] = [];
  const total = paths.length;
  for (let i = 0; i < paths.length; i++) {
    const abs = paths[i]!;
    const row = await indexOneFile(buildDirAbs, abs);
    if (row && "failed" in row) {
      skippedReadFiles += 1;
      if (skippedReadSamples.length < 5) {
        skippedReadSamples.push({ path: row.rel, code: row.code });
      }
    } else if (row) {
      staged.push(row);
    }
    onProgress?.({ phase: "index", current: i + 1, total });
  }

  const needCompress = Boolean(compression.gzip || compression.brotli);
  const entries: FileEntry[] = [];

  if (!needCompress) {
    for (const s of staged) {
      entries.push({
        path: s.path,
        extension: s.extension,
        type: s.type,
        rawBytes: s.rawBytes,
        gzipBytes: null,
        brotliBytes: null,
        nameHash: s.nameHash,
        isSourceMap: s.isSourceMap,
        relatedSourceMap: s.relatedSourceMap,
        relatedFile: s.relatedFile,
      });
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

  const cTotal = staged.length;
  for (let j = 0; j < staged.length; j++) {
    const s = staged[j]!;
    let gzipBytes: number | null = null;
    let brotliBytes: number | null = null;
    try {
      const buf = await fs.readFile(s.absPath);
      const m = measureCompression(buf, compression);
      gzipBytes = m.gzipBytes;
      brotliBytes = m.brotliBytes;
    } catch (e) {
      compressionReadErrors += 1;
      if (compressionReadSamples.length < 5) {
        compressionReadSamples.push({ path: s.path, code: errnoCode(e) });
      }
      gzipBytes = null;
      brotliBytes = null;
    }

    entries.push({
      path: s.path,
      extension: s.extension,
      type: s.type,
      rawBytes: s.rawBytes,
      gzipBytes,
      brotliBytes,
      nameHash: s.nameHash,
      isSourceMap: s.isSourceMap,
      relatedSourceMap: s.relatedSourceMap,
      relatedFile: s.relatedFile,
    });
    onProgress?.({ phase: "compress", current: j + 1, total: cTotal });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return {
    entries,
    diagnostics: {
      discoveredFiles: paths.length,
      indexedFiles: entries.length,
      skippedReadFiles,
      compressionReadErrors,
      skippedReadSamples,
      compressionReadSamples,
    },
  };
}
