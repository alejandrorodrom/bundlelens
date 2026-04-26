/**
 * Shape of `bundlelens.config.json` and the fully merged settings used by the CLI/core.
 */

/** High-level file classification for metrics and thresholds. */
export type FileCategory =
  | "javascript"
  | "css"
  | "image"
  | "font"
  | "sourcemap"
  | "html"
  | "json"
  | "wasm"
  | "media"
  | "other";

/** Optional per-category numeric limits when thresholds are enabled. */
export type ThresholdCategoryConfig = {
  maxFileRawBytes?: number;
  maxFileGzipBytes?: number;
  maxTotalRawBytes?: number;
  maxTotalGzipBytes?: number;
};

/** Threshold feature toggle plus per-category rules. */
export type ThresholdsConfig = {
  enabled: boolean;
  categories: Partial<Record<FileCategory, ThresholdCategoryConfig>>;
};

/** Which compression passes to run while indexing files. */
export type CompressionConfig = {
  gzip: boolean;
  brotli: boolean;
};

/** Default refs for `bundlelens compare` when flags are omitted. */
export type CompareConfig = {
  baseBranch?: string;
  headBranch?: string;
};

/** Preferred non-interactive install command when `node_modules` is missing. */
export type InstallConfig = {
  command?: string;
};

/** On-disk config merged with CLI flags by `resolveConfig`. */
export type BundleLensConfig = {
  $schema?: string;
  buildCommand?: string;
  buildDir?: string;
  outputDir?: string;
  audit?: boolean;
  failOnBuild?: boolean;
  compression?: Partial<CompressionConfig>;
  thresholds?: Partial<ThresholdsConfig>;
  compare?: CompareConfig;
  install?: InstallConfig;
};

export type ResolvedCompression = CompressionConfig;

export type ResolvedThresholds = ThresholdsConfig;

/** Effective paths and flags after merging file config with CLI overrides. */
export type ResolvedConfig = {
  buildCommand: string | undefined;
  buildDir: string | undefined;
  outputDir: string;
  audit: boolean;
  failOnBuild: boolean;
  compression: ResolvedCompression;
  thresholds: ResolvedThresholds;
  configPath: string | undefined;
  compare?: CompareConfig;
  install?: InstallConfig;
};
