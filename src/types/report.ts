/**
 * JSON payloads produced by BundleLens (single run, compare, and embedded HTML).
 */
import type { FileCategory } from "./config.js";

/** Record of the user build command executed in `run` mode. */
export type BuildExecution = {
  command: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  cwd: string;
};

/** One indexed artifact under the analyzed build directory. */
export type FileEntry = {
  path: string;
  extension: string;
  type: FileCategory;
  rawBytes: number;
  gzipBytes: number | null;
  brotliBytes: number | null;
  nameHash: string | null;
  isSourceMap: boolean;
  relatedSourceMap: string | null;
  relatedFile: string | null;
};

/** Per-category rollup used by `Summary.byType`. */
export type ByTypeEntry = {
  type: FileCategory;
  count: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  totalBrotliBytes: number;
  percentOfFiles: number;
  percentOfRawBytes: number;
};

/** Global totals plus per-type aggregates. */
export type Summary = {
  totalFiles: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  totalBrotliBytes: number;
  byType: ByTypeEntry[];
};

/** Single row in a size ranking table. */
export type RankingItem = {
  path: string;
  bytes: number;
};

/** Pre-sorted ranking tables for the HTML/JSON report. */
export type Rankings = {
  filesByRawBytes: RankingItem[];
  filesByGzipBytes: RankingItem[];
  filesByBrotliBytes: RankingItem[];
  javascriptByRawBytes: RankingItem[];
  cssByRawBytes: RankingItem[];
  assetsByRawBytes: RankingItem[];
  sourceMapsByRawBytes: RankingItem[];
};

/** Raw-size histogram bucket labels. */
export type SizeBucket =
  | "0-10kb"
  | "10-50kb"
  | "50-100kb"
  | "100-500kb"
  | "500kb-1mb"
  | "1mb+";

/** File counts keyed by raw-size bucket. */
export type DistributionGroup = Record<SizeBucket, number>;

/** Histograms for all files and major categories. */
export type Distributions = {
  all: DistributionGroup;
  javascript: DistributionGroup;
  css: DistributionGroup;
  image: DistributionGroup;
  font: DistributionGroup;
  sourcemap: DistributionGroup;
  other: DistributionGroup;
};

/** Raw-byte percentile tuple for one slice. */
export type PercentileSet = {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
};

/** Percentiles of raw sizes per distribution slice. */
export type Percentiles = {
  all: PercentileSet;
  javascript: PercentileSet;
  css: PercentileSet;
  image: PercentileSet;
  font: PercentileSet;
  sourcemap: PercentileSet;
  other: PercentileSet;
};

/** One row from `npm audit --json` (normalized subset). */
export type AuditVulnerability = {
  package: string;
  severity: string;
  isDirect: boolean | null;
  via: unknown;
  range: string | null;
  nodes: unknown;
  fixAvailable: unknown;
};

/** Aggregated audit outcome for HTML/JSON reports. */
export type AuditReport = {
  status: "ok" | "clean" | "requires_internet" | "error";
  message: string | null;
  total: number | null;
  bySeverity: Record<string, number>;
  byDirectness: {
    direct: number;
    transitive: number;
    unknown: number;
  };
  vulnerabilities: AuditVulnerability[];
  raw: unknown;
};

/** One threshold evaluation (per file or aggregate metric). */
export type ThresholdResult = {
  category: FileCategory;
  metric: string;
  configuredValue: number;
  actualValue: number;
  file: string | undefined;
  exceeded: boolean;
};

/** Run context, timing, and non-fatal scan notices. */
export type ReportMetadata = {
  generatedAt: string;
  bundlelensVersion: string;
  mode: "run" | "analyze";
  buildDir: string;
  outputDir: string;
  analysisDurationMs: number;
  analysisNotices?: string[];
};

/** How much of the bundle consists of source maps vs deliverable JS/CSS. */
export type SourceMapFootprint = {
  sourceMapFileCount: number;
  sourceMapRawBytes: number;
  deliverableJsCssFileCount: number;
  deliverableJsCssRawBytes: number;
  percentOfTotalRawBytesInSourceMaps: number;
  percentOfFilesThatAreSourceMaps: number;
};

/** Largest file contribution to total raw bytes. */
export type BundleConcentration = {
  largestFilePath: string | null;
  largestFileRawBytes: number;
  largestFilePercentOfTotalRaw: number;
};

/** gzip/brotli vs raw ratios for a file category. */
export type CompressionRatioStats = {
  fileCount: number;
  medianGzipOverRaw: number | null;
  meanGzipOverRaw: number | null;
  medianBrotliOverRaw: number | null;
  meanBrotliOverRaw: number | null;
};

/** Near-empty artifacts at or below a byte threshold. */
export type EmptyFilesInsight = {
  thresholdBytes: number;
  count: number;
  samplePaths: string[];
};

/** First path segment rollup (top-level folder share of raw bytes). */
export type TopLevelFolderStat = {
  folder: string;
  fileCount: number;
  totalRawBytes: number;
  percentOfTotalRawBytes: number;
};

/** Heuristic warning when many maps ship with sizeable JS. */
export type ProductionMapsInsight = {
  triggered: boolean;
  reason: string;
};

/** Content-hash naming vs plain names and duplicate basenames. */
export type NameHashInsight = {
  withContentHashCount: number;
  withoutContentHashCount: number;
  duplicateBasenameFileCount: number;
};

/** Derived diagnostics beyond raw tables (maps, concentration, hashing, etc.). */
export type BundleInsights = {
  sourceMaps: SourceMapFootprint;
  concentration: BundleConcentration;
  compressionRatios: {
    javascript: CompressionRatioStats | null;
    css: CompressionRatioStats | null;
  };
  emptyFiles: EmptyFilesInsight;
  topLevelFolders: TopLevelFolderStat[];
  productionMaps: ProductionMapsInsight;
  nameHash: NameHashInsight;
};

/** Complete output of `analyzeBuildDir` / `bundlelens run|analyze`. */
export type BundleLensReport = {
  metadata: ReportMetadata;
  build: BuildExecution | null;
  files: FileEntry[];
  summary: Summary;
  rankings: Rankings;
  distributions: Distributions;
  percentiles: Percentiles;
  audit: AuditReport | null;
  thresholds: ThresholdResult[] | null;
  insights: BundleInsights;
};

/** Payload for `compare.html` / `compare-report.json` (two full reports + refs). */
export type BundleLensCompareReport = {
  _bundlelensCompare: true;
  bundlelensVersion: string;
  generatedAt: string;
  baseRef: string;
  headRef: string;
  base: BundleLensReport;
  head: BundleLensReport;
};
