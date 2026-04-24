import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { FileEntry } from "../types/report.js";
import type { ResolvedCompression } from "../types/config.js";
import { measureCompression } from "../utils/compression.js";
import {
  classifyFile,
  detectNameHash,
  relatedPathsForFile,
} from "../utils/fileTypes.js";

export async function collectFiles(
  buildDirAbs: string,
  compression: ResolvedCompression
): Promise<FileEntry[]> {
  const paths = await fg("**/*", {
    cwd: buildDirAbs,
    onlyFiles: true,
    dot: true,
    absolute: true,
    followSymbolicLinks: true,
  });

  const entries: FileEntry[] = [];
  for (const abs of paths) {
    const rel = path.relative(buildDirAbs, abs).split(path.sep).join("/");
    if (rel === "" || rel.startsWith("..")) continue;

    const { extension, type, isSourceMap } = classifyFile(rel);
    const base = path.basename(rel);
    const nameHash = detectNameHash(base);

    let buf: Buffer;
    try {
      buf = await fs.readFile(abs);
    } catch {
      continue;
    }
    const rawBytes = buf.length;
    const { gzipBytes, brotliBytes } = measureCompression(buf, compression);

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

    entries.push({
      path: rel,
      extension,
      type,
      rawBytes,
      gzipBytes,
      brotliBytes,
      nameHash,
      isSourceMap,
      relatedSourceMap: relMap.relatedSourceMap,
      relatedFile: relMap.relatedFile,
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}
