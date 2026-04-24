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

export type BundleLensConfig = {
  buildCommand?: string;
  /** Carpeta de salida del build a inspeccionar. Ruta relativa: respecto a este archivo de configuración. */
  buildDir?: string;
  outputDir?: string;
  /** Por defecto se ejecuta `npm audit`. Pon `false` para omitirlo sin usar la CLI. `--no-audit` en la CLI tiene prioridad. */
  audit?: boolean;
  /**
   * Si es true, el proceso termina con el código de salida del comando de build cuando no es 0.
   * Por defecto false: si el análisis y el informe terminan bien, el exit code es 0 aunque el build devolviera error.
   */
  failOnBuild?: boolean;
  compression?: Partial<CompressionConfig>;
  thresholds?: Partial<ThresholdsConfig>;
};

export type ResolvedCompression = CompressionConfig;

export type ResolvedThresholds = ThresholdsConfig;

export type ResolvedConfig = {
  buildCommand: string | undefined;
  /** Directorio de artefactos a analizar; ruta absoluta si está definido. */
  buildDir: string | undefined;
  outputDir: string;
  audit: boolean;
  failOnBuild: boolean;
  compression: ResolvedCompression;
  thresholds: ResolvedThresholds;
  configPath: string | undefined;
};
