import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  AnyMap,
  decodedMappings,
  type SourceMapInput,
  type SourceMapSegment,
} from "@jridgewell/trace-mapping";
import type { FileEntry } from "../types/report.js";
import type {
  CompositionArtifact,
  CompositionArtifactPackage,
  CompositionPackage,
  CompositionReport,
} from "../types/report.js";
import { pathExists } from "../utils/pathExists.js";

const UNMAPPED_ID = "(unmapped)";
const PROJECT_ID = "(project)";

const SOURCE_MAPPING_URL_RE =
  /(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=\s*(\S+)\s*(?:\*\/)?\s*$/;

/**
 * Maps a source-map `sources` path to a package id (`lodash`, `@scope/pkg`, `(project)`).
 *
 * @param sourcePath - Path from the source map `sources` array (may be webpack/vite virtual).
 * @returns Stable package bucket id.
 */
export function packageIdFromSourcePath(sourcePath: string | null | undefined): string {
  if (sourcePath == null || sourcePath === "") {
    return UNMAPPED_ID;
  }
  const normalized = sourcePath.replace(/\\/g, "/");
  const nm = normalized.match(
    /(?:^|\/)node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)/
  );
  if (nm?.[1]) {
    return nm[1];
  }
  return PROJECT_ID;
}

/**
 * Reads a trailing `sourceMappingURL` comment from generated JS/CSS text.
 *
 * @param content - Generated file contents.
 * @returns Relative or absolute URL string, or `null`.
 */
export function extractSourceMappingUrl(content: string): string | null {
  const tail = content.slice(Math.max(0, content.length - 4096));
  const lines = tail.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;
    const m = line.match(SOURCE_MAPPING_URL_RE);
    if (m?.[1]) return m[1].trim();
    // Stop after first non-empty, non-comment-looking line near EOF.
    if (!line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")) {
      break;
    }
  }
  return null;
}

/**
 * Resolves a local map path under `buildDir` from a `sourceMappingURL` value.
 * Remote/`data:` URLs are rejected.
 *
 * @param buildDirAbs - Absolute build output directory.
 * @param artifactRel - Artifact path relative to `buildDir`.
 * @param mapUrl - Value from `sourceMappingURL`.
 * @returns Absolute map path when inside `buildDir`, otherwise `null`.
 */
export function resolveLocalMapPath(
  buildDirAbs: string,
  artifactRel: string,
  mapUrl: string
): string | null {
  const trimmed = mapUrl.trim();
  if (
    !trimmed ||
    /^https?:\/\//i.test(trimmed) ||
    /^data:/i.test(trimmed) ||
    trimmed.startsWith("//")
  ) {
    return null;
  }
  const artifactAbs = path.join(buildDirAbs, artifactRel);
  const mapAbs = path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.normalize(path.resolve(path.dirname(artifactAbs), trimmed));
  const buildRoot = path.resolve(buildDirAbs) + path.sep;
  const resolved = path.resolve(mapAbs);
  if (resolved !== path.resolve(buildDirAbs) && !resolved.startsWith(buildRoot)) {
    return null;
  }
  return resolved;
}

function utf8SliceBytes(line: string, startCol: number, endCol: number): number {
  if (endCol <= startCol) return 0;
  const start = Math.max(0, Math.min(line.length, startCol));
  const end = Math.max(start, Math.min(line.length, endCol));
  return Buffer.byteLength(line.slice(start, end), "utf8");
}

function segmentSourceId(
  segment: Readonly<SourceMapSegment>,
  sources: readonly (string | null)[]
): string {
  if (segment.length < 2 || typeof segment[1] !== "number") {
    return UNMAPPED_ID;
  }
  const src = sources[segment[1]];
  return packageIdFromSourcePath(src);
}

/**
 * Attributes generated file bytes to package ids using decoded source-map segments.
 *
 * @param generatedText - UTF-8 text of the generated artifact.
 * @param sources - Source map `sources` list.
 * @param mappings - Decoded mappings from `decodedMappings`.
 * @returns Map of package id → attributed raw bytes.
 */
export function attributeBytesToPackages(
  generatedText: string,
  sources: readonly (string | null)[],
  mappings: readonly (readonly SourceMapSegment[])[]
): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (id: string, n: number): void => {
    if (n <= 0) return;
    totals.set(id, (totals.get(id) ?? 0) + n);
  };

  // Split keeping line bodies without newline; attribute newline bytes as unmapped.
  const lines = generatedText.split(/\n/);
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? "";
    // Preserve `\r` as part of the line body when present (split only on `\n`).
    const segs = mappings[lineIdx] ?? [];
    if (segs.length === 0) {
      add(UNMAPPED_ID, Buffer.byteLength(line, "utf8"));
    } else {
      let cursor = 0;
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const col = seg[0];
        if (col > cursor) {
          add(UNMAPPED_ID, utf8SliceBytes(line, cursor, col));
        }
        const nextCol =
          i + 1 < segs.length ? segs[i + 1][0] : line.length;
        const from = Math.max(col, cursor);
        add(segmentSourceId(seg, sources), utf8SliceBytes(line, from, nextCol));
        cursor = Math.max(cursor, nextCol);
      }
      if (cursor < line.length) {
        add(UNMAPPED_ID, utf8SliceBytes(line, cursor, line.length));
      }
    }
    if (lineIdx < lines.length - 1) {
      // The `\n` removed by split (and optional preceding handling already in line).
      add(UNMAPPED_ID, 1);
    }
  }

  return totals;
}

function toSortedPackages(
  totals: Map<string, number>,
  artifactRaw: number
): CompositionArtifactPackage[] {
  const safe = artifactRaw > 0 ? artifactRaw : 1;
  return [...totals.entries()]
    .map(([id, rawBytes]) => ({
      id,
      rawBytes,
      percentOfArtifactRaw: (rawBytes / safe) * 100,
    }))
    .sort((a, b) => b.rawBytes - a.rawBytes || a.id.localeCompare(b.id));
}

async function resolveMapRelPath(
  buildDirAbs: string,
  file: FileEntry,
  generatedText: string
): Promise<string | null> {
  if (file.relatedSourceMap) {
    const abs = path.join(buildDirAbs, file.relatedSourceMap);
    if (await pathExists(abs)) return file.relatedSourceMap;
  }
  const url = extractSourceMappingUrl(generatedText);
  if (!url) return null;
  const abs = resolveLocalMapPath(buildDirAbs, file.path, url);
  if (!abs || !(await pathExists(abs))) return null;
  return path.relative(buildDirAbs, abs).split(path.sep).join("/");
}

async function analyzeOneArtifact(
  buildDirAbs: string,
  file: FileEntry
): Promise<CompositionArtifact> {
  const artifactAbs = path.join(buildDirAbs, file.path);
  let generatedText: string;
  try {
    generatedText = await fs.readFile(artifactAbs, "utf8");
  } catch (e) {
    return {
      path: file.path,
      mapPath: null,
      rawBytes: file.rawBytes,
      packages: [],
      status: "parse-error",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const mapRel = await resolveMapRelPath(buildDirAbs, file, generatedText);
  if (!mapRel) {
    return {
      path: file.path,
      mapPath: null,
      rawBytes: file.rawBytes,
      packages: [],
      status: "no-map",
    };
  }

  const mapAbs = path.join(buildDirAbs, mapRel);
  try {
    const mapRaw = await fs.readFile(mapAbs, "utf8");
    const mapJson = JSON.parse(mapRaw) as SourceMapInput;
    const tracer = new AnyMap(mapJson, pathToFileURL(mapAbs).href);
    const decoded = decodedMappings(tracer);
    const sources = tracer.resolvedSources?.length
      ? tracer.resolvedSources
      : tracer.sources;
    const totals = attributeBytesToPackages(generatedText, sources, decoded);

    // Scale attributed sum to file.rawBytes if mismatch (encoding / BOM / etc.).
    let attributed = 0;
    for (const n of totals.values()) attributed += n;
    if (attributed > 0 && file.rawBytes > 0 && attributed !== file.rawBytes) {
      const scale = file.rawBytes / attributed;
      for (const [id, n] of totals) {
        totals.set(id, Math.round(n * scale));
      }
    }

    return {
      path: file.path,
      mapPath: mapRel,
      rawBytes: file.rawBytes,
      packages: toSortedPackages(totals, file.rawBytes),
      status: "ok",
    };
  } catch (e) {
    return {
      path: file.path,
      mapPath: mapRel,
      rawBytes: file.rawBytes,
      packages: [],
      status: "parse-error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type BuildCompositionOptions = {
  buildDirAbs: string;
  files: FileEntry[];
  onStatus?: (message: string) => void;
};

/**
 * Builds package composition for JS/CSS artifacts that have usable source maps.
 *
 * @param options - Build dir, indexed files, optional status callback.
 * @returns Composition report (may contain only `no-map` / error rows).
 */
export async function buildCompositionReport(
  options: BuildCompositionOptions
): Promise<CompositionReport> {
  const { buildDirAbs, files, onStatus } = options;
  const candidates = files.filter(
    (f) =>
      !f.isSourceMap &&
      (f.type === "javascript" || f.type === "css") &&
      f.rawBytes > 0
  );

  const artifacts: CompositionArtifact[] = [];
  const total = candidates.length;
  for (let i = 0; i < candidates.length; i++) {
    onStatus?.(
      `Packages: ${i + 1}/${total} — ${candidates[i].path}`
    );
    artifacts.push(await analyzeOneArtifact(buildDirAbs, candidates[i]));
  }

  const okArtifacts = artifacts.filter((a) => a.status === "ok");
  const skippedArtifactCount = artifacts.length - okArtifacts.length;
  let totalAnalyzedRawBytes = 0;
  for (const a of okArtifacts) totalAnalyzedRawBytes += a.rawBytes;

  const global = new Map<string, { rawBytes: number; artifacts: Set<string> }>();
  for (const a of okArtifacts) {
    for (const p of a.packages) {
      let row = global.get(p.id);
      if (!row) {
        row = { rawBytes: 0, artifacts: new Set() };
        global.set(p.id, row);
      }
      row.rawBytes += p.rawBytes;
      row.artifacts.add(a.path);
    }
  }

  const safeTotal = totalAnalyzedRawBytes > 0 ? totalAnalyzedRawBytes : 1;
  const packagesByRawBytes: CompositionPackage[] = [...global.entries()]
    .map(([id, row]) => ({
      id,
      rawBytes: row.rawBytes,
      percentOfAnalyzedRaw: (row.rawBytes / safeTotal) * 100,
      artifactCount: row.artifacts.size,
    }))
    .sort((a, b) => b.rawBytes - a.rawBytes || a.id.localeCompare(b.id));

  return {
    analyzedArtifactCount: okArtifacts.length,
    skippedArtifactCount,
    totalAnalyzedRawBytes,
    packagesByRawBytes,
    artifacts,
  };
}
