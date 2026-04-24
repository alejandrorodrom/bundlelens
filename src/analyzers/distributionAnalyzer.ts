import type { FileCategory } from "../types/config.js";
import type {
  DistributionGroup,
  Distributions,
  FileEntry,
  SizeBucket,
} from "../types/report.js";
import { bucketForRawBytes } from "../utils/bytes.js";

const BUCKETS: SizeBucket[] = [
  "0-10kb",
  "10-50kb",
  "50-100kb",
  "100-500kb",
  "500kb-1mb",
  "1mb+",
];

function emptyGroup(): DistributionGroup {
  return {
    "0-10kb": 0,
    "10-50kb": 0,
    "50-100kb": 0,
    "100-500kb": 0,
    "500kb-1mb": 0,
    "1mb+": 0,
  };
}

function addToGroup(group: DistributionGroup, rawBytes: number): void {
  const b = bucketForRawBytes(rawBytes);
  group[b] += 1;
}

function filterTypes(files: FileEntry[], types: Set<FileCategory>): FileEntry[] {
  return files.filter((f) => types.has(f.type));
}

/** Agrupa `html`, `json`, `wasm`, `media` y `other` en "other" para distribuciones. */
const OTHER_DIST_TYPES = new Set<FileCategory>([
  "html",
  "json",
  "wasm",
  "media",
  "other",
]);

export function buildDistributions(files: FileEntry[]): Distributions {
  const all = emptyGroup();
  const javascript = emptyGroup();
  const css = emptyGroup();
  const image = emptyGroup();
  const font = emptyGroup();
  const sourcemap = emptyGroup();
  const other = emptyGroup();

  for (const f of files) {
    addToGroup(all, f.rawBytes);
    if (f.type === "javascript") addToGroup(javascript, f.rawBytes);
    else if (f.type === "css") addToGroup(css, f.rawBytes);
    else if (f.type === "image") addToGroup(image, f.rawBytes);
    else if (f.type === "font") addToGroup(font, f.rawBytes);
    else if (f.type === "sourcemap") addToGroup(sourcemap, f.rawBytes);
    else if (OTHER_DIST_TYPES.has(f.type)) addToGroup(other, f.rawBytes);
  }

  return { all, javascript, css, image, font, sourcemap, other };
}

export function filesInDistributionSlice(
  files: FileEntry[],
  slice: keyof Distributions
): FileEntry[] {
  if (slice === "all") return files;
  if (slice === "javascript")
    return files.filter((f) => f.type === "javascript");
  if (slice === "css") return files.filter((f) => f.type === "css");
  if (slice === "image") return files.filter((f) => f.type === "image");
  if (slice === "font") return files.filter((f) => f.type === "font");
  if (slice === "sourcemap")
    return files.filter((f) => f.type === "sourcemap");
  return filterTypes(files, OTHER_DIST_TYPES);
}

export { BUCKETS };
