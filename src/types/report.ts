import type { FileCategory } from "./config.js";

export type BuildExecution = {
  command: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  cwd: string;
};

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

export type ByTypeEntry = {
  type: FileCategory;
  count: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  totalBrotliBytes: number;
  percentOfFiles: number;
  percentOfRawBytes: number;
};

export type Summary = {
  totalFiles: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  totalBrotliBytes: number;
  byType: ByTypeEntry[];
};

export type RankingItem = {
  path: string;
  bytes: number;
};

export type Rankings = {
  filesByRawBytes: RankingItem[];
  filesByGzipBytes: RankingItem[];
  filesByBrotliBytes: RankingItem[];
  javascriptByRawBytes: RankingItem[];
  cssByRawBytes: RankingItem[];
  assetsByRawBytes: RankingItem[];
  sourceMapsByRawBytes: RankingItem[];
};

export type SizeBucket =
  | "0-10kb"
  | "10-50kb"
  | "50-100kb"
  | "100-500kb"
  | "500kb-1mb"
  | "1mb+";

export type DistributionGroup = Record<SizeBucket, number>;

export type Distributions = {
  all: DistributionGroup;
  javascript: DistributionGroup;
  css: DistributionGroup;
  image: DistributionGroup;
  font: DistributionGroup;
  sourcemap: DistributionGroup;
  other: DistributionGroup;
};

export type PercentileSet = {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
};

export type Percentiles = {
  all: PercentileSet;
  javascript: PercentileSet;
  css: PercentileSet;
  image: PercentileSet;
  font: PercentileSet;
  sourcemap: PercentileSet;
  other: PercentileSet;
};

export type AuditVulnerability = {
  package: string;
  severity: string;
  isDirect: boolean | null;
  via: unknown;
  range: string | null;
  nodes: unknown;
  fixAvailable: unknown;
};

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

export type ThresholdResult = {
  category: FileCategory;
  metric: string;
  configuredValue: number;
  actualValue: number;
  file: string | undefined;
  exceeded: boolean;
};

export type ReportMetadata = {
  generatedAt: string;
  bundlelensVersion: string;
  mode: "run" | "analyze";
  buildDir: string;
  outputDir: string;
};

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
};
