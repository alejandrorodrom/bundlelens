import type { FileCategory } from "../types/config.js";
import type {
  DistributionGroup,
  Distributions,
  FileEntry,
  SizeBucket,
} from "../types/report.js";
import { bucketForRawBytes } from "../utils/bytes.js";

/** Stable iteration order for `Distributions` / `Percentiles` slice keys. */
export const DISTRIBUTION_SLICE_KEYS: (keyof Distributions)[] = [
  "all",
  "javascript",
  "css",
  "image",
  "font",
  "sourcemap",
  "other",
];

const BUCKETS: SizeBucket[] = [
  "0-10kb",
  "10-50kb",
  "50-100kb",
  "100-500kb",
  "500kb-1mb",
  "1mb+",
];

/**
 * @returns Zeroed histogram buckets for every `SizeBucket`.
 */
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

/**
 * @param group - Histogram to mutate in place.
 * @param rawBytes - File size used to pick the bucket.
 */
function addToGroup(group: DistributionGroup, rawBytes: number): void {
  const b = bucketForRawBytes(rawBytes);
  group[b] += 1;
}

/**
 * @param files - Candidate files.
 * @param types - Allowed `FileCategory` values.
 * @returns Files whose `type` is in `types`.
 */
function filterTypes(files: FileEntry[], types: Set<FileCategory>): FileEntry[] {
  return files.filter((f) => types.has(f.type));
}

const OTHER_DIST_TYPES = new Set<FileCategory>([
  "html",
  "json",
  "wasm",
  "media",
  "other",
]);

/** Raw byte sizes per histogram slice (same membership as {@link filesInDistributionSlice}). */
export type RawBytesByDistributionSlice = {
  [K in keyof Distributions]: number[];
};

/**
 * Collects `rawBytes` per distribution slice in one pass (for percentiles and similar stats).
 */
export function collectRawBytesByDistributionSlice(
  files: FileEntry[]
): RawBytesByDistributionSlice {
  const all: number[] = [];
  const javascript: number[] = [];
  const css: number[] = [];
  const image: number[] = [];
  const font: number[] = [];
  const sourcemap: number[] = [];
  const other: number[] = [];

  for (const f of files) {
    const b = f.rawBytes;
    all.push(b);
    if (f.type === "javascript") {
      javascript.push(b);
    } else if (f.type === "css") {
      css.push(b);
    } else if (f.type === "image") {
      image.push(b);
    } else if (f.type === "font") {
      font.push(b);
    } else if (f.type === "sourcemap") {
      sourcemap.push(b);
    } else if (OTHER_DIST_TYPES.has(f.type)) {
      other.push(b);
    }
  }

  return { all, javascript, css, image, font, sourcemap, other };
}

/**
 * Histograms of file counts by raw-size bucket, overall and per category.
 *
 * @param files - Indexed build artifacts.
 * @returns Counts per bucket for `all` plus major categories.
 */
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

/**
 * Filters files belonging to the slice used in `Distributions[slice]`.
 *
 * @param files - Indexed build artifacts.
 * @param slice - Distribution key (`all`, per-type, or grouped `other`).
 * @returns Files that contribute to that slice's histogram.
 */
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

/** Ordered raw-size bucket keys used in distribution histograms. */
export { BUCKETS };
