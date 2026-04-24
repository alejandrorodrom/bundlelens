import path from "node:path";
import type { FileCategory } from "../types/config.js";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".bmp",
  ".tiff",
  ".svg",
]);

const FONT_EXT = new Set([
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
]);

const MEDIA_EXT = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".mp3",
  ".wav",
  ".m4a",
]);

/** Patrones habituales de hash en nombres de artefactos (webpack, vite, etc.) */
const HASH_IN_NAME =
  /[._-]([0-9a-f]{8,32}|[0-9A-F]{8,32})(?=\.[a-z0-9]+$)/i;

export function detectNameHash(basename: string): string | null {
  const m = basename.match(HASH_IN_NAME);
  return m?.[1] ?? null;
}

export function classifyFile(relPath: string): {
  extension: string;
  type: FileCategory;
  isSourceMap: boolean;
} {
  const ext = path.extname(relPath).toLowerCase();
  const lower = relPath.toLowerCase();
  const isSourceMap = ext === ".map" || lower.endsWith(".css.map") || lower.endsWith(".js.map");

  if (isSourceMap) {
    return { extension: ext || ".map", type: "sourcemap", isSourceMap: true };
  }
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    return { extension: ext, type: "javascript", isSourceMap: false };
  }
  if (ext === ".css") {
    return { extension: ext, type: "css", isSourceMap: false };
  }
  if (ext === ".html" || ext === ".htm") {
    return { extension: ext, type: "html", isSourceMap: false };
  }
  if (ext === ".json") {
    return { extension: ext, type: "json", isSourceMap: false };
  }
  if (ext === ".wasm") {
    return { extension: ext, type: "wasm", isSourceMap: false };
  }
  if (IMAGE_EXT.has(ext)) {
    return { extension: ext, type: "image", isSourceMap: false };
  }
  if (FONT_EXT.has(ext)) {
    return { extension: ext, type: "font", isSourceMap: false };
  }
  if (MEDIA_EXT.has(ext)) {
    return { extension: ext, type: "media", isSourceMap: false };
  }
  return { extension: ext || "(none)", type: "other", isSourceMap: false };
}

export function relatedPathsForFile(
  relPath: string,
  type: FileCategory,
  isSourceMap: boolean
): { relatedSourceMap: string | null; relatedFile: string | null } {
  if (isSourceMap) {
    const base = relPath.replace(/\.map$/i, "");
    return { relatedSourceMap: null, relatedFile: base };
  }
  if (type === "javascript" || type === "css") {
    const mapPath = `${relPath}.map`;
    return { relatedSourceMap: mapPath, relatedFile: null };
  }
  return { relatedSourceMap: null, relatedFile: null };
}
