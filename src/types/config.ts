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

export type ThresholdCategoryConfig = {
  maxFileRawBytes?: number;
  maxFileGzipBytes?: number;
  maxTotalRawBytes?: number;
  maxTotalGzipBytes?: number;
};

export type ThresholdsConfig = {
  enabled: boolean;
  categories: Partial<Record<FileCategory, ThresholdCategoryConfig>>;
};

export type CompressionConfig = {
  gzip: boolean;
  brotli: boolean;
};

export type CompareConfig = {
  /** Git branch or ref for the diff base side (e.g. `main`). */
  baseBranch?: string;
  /** Git branch or ref for the head side (e.g. your feature branch). */
  headBranch?: string;
};

export type InstallConfig = {
  /**
   * Preferred install command when dependencies are missing.
   * If unset, the CLI asks interactively.
   */
  command?: string;
};

export type BundleLensConfig = {
  /** Optional JSON schema URI for editor autocomplete/validation. */
  $schema?: string;
  buildCommand?: string;
  /** Build output directory to inspect. Relative paths are resolved from this config file. */
  buildDir?: string;
  outputDir?: string;
  /** When true, runs `npm audit`. Set `false` to skip without CLI flags. CLI `--no-audit` / `--audit` override this. */
  audit?: boolean;
  /**
   * When true, exit with the build command's non-zero exit code.
   * Default false: if analysis and report succeed, exit code is 0 even when the build failed.
   */
  failOnBuild?: boolean;
  compression?: Partial<CompressionConfig>;
  thresholds?: Partial<ThresholdsConfig>;
  /**
   * Defaults for `bundlelens compare` when `--base` / `--head` are omitted.
   * CLI flags override these fields.
   */
  compare?: CompareConfig;
  /** Dependency installation behavior used by `run` and `compare`. */
  install?: InstallConfig;
};

export type ResolvedCompression = CompressionConfig;

export type ResolvedThresholds = ThresholdsConfig;

export type ResolvedConfig = {
  buildCommand: string | undefined;
  /** Artifact directory to analyze; absolute path when set. */
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
