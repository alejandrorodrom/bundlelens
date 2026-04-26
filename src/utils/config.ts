import fs from "node:fs/promises";
import path from "node:path";
import type {
  BundleLensConfig,
  ResolvedConfig,
  ResolvedThresholds,
} from "../types/config.js";

/** Default config file name in the project root. */
export const BUNDLELENS_CONFIG_FILENAME = "bundlelens.config.json";

const DEFAULT_CONFIG_NAMES = [BUNDLELENS_CONFIG_FILENAME];

const defaultCompression = { gzip: true, brotli: true };

/**
 * Resolves an explicit path or discovers `bundlelens.config.json` under `cwd`.
 *
 * @param cwd - Project directory used for relative resolution.
 * @param explicitPath - Optional user-provided config path (relative to `cwd` or absolute).
 * @returns Absolute config path when found, otherwise `undefined`.
 */
export async function findConfigFile(
  cwd: string,
  explicitPath?: string
): Promise<string | undefined> {
  if (explicitPath) {
    const abs = path.resolve(cwd, explicitPath);
    try {
      await fs.access(abs);
      return abs;
    } catch {
      return undefined;
    }
  }
  for (const name of DEFAULT_CONFIG_NAMES) {
    const p = path.join(cwd, name);
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return undefined;
}

/**
 * @param filePath - Absolute path to JSON config on disk.
 * @returns Parsed `BundleLensConfig` object.
 */
async function readJsonConfig(filePath: string): Promise<BundleLensConfig> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as BundleLensConfig;
}

/**
 * Resolves `buildDir` from CLI override vs file config with correct anchor directory.
 *
 * @param cwd - Project cwd.
 * @param configPath - Absolute config file path, when any.
 * @param primary - CLI override for `buildDir` (wins when set).
 * @param fallback - File-config `buildDir` when no CLI override.
 * @returns Absolute build directory, or `undefined`.
 */
function resolveBuildDirAbs(
  cwd: string,
  configPath: string | undefined,
  primary: string | undefined,
  fallback: string | undefined
): string | undefined {
  const trimmedPrimary = primary?.trim();
  if (trimmedPrimary) {
    return path.resolve(cwd, trimmedPrimary);
  }
  const trimmedFile = fallback?.trim();
  if (!trimmedFile) {
    return undefined;
  }
  if (path.isAbsolute(trimmedFile)) {
    return path.normalize(trimmedFile);
  }
  if (configPath) {
    return path.resolve(path.dirname(configPath), trimmedFile);
  }
  return path.resolve(cwd, trimmedFile);
}

/** CLI flags and paths merged over optional file-based `BundleLensConfig`. */
export type CliOverrides = {
  buildCommand?: string;
  buildDir?: string;
  outputDir?: string;
  audit?: boolean;
  failOnBuild?: boolean;
  configPath?: string;
};

/**
 * Loads `bundlelens.config.json` (if any) and merges CLI overrides into a resolved shape.
 *
 * @param cwd - Project directory for resolving relative paths.
 * @param overrides - CLI-provided fields that override file config.
 * @returns Fully merged `ResolvedConfig`.
 */
export async function resolveConfig(
  cwd: string,
  overrides: CliOverrides
): Promise<ResolvedConfig> {
  const configPath = await findConfigFile(cwd, overrides.configPath);
  let fileConfig: BundleLensConfig = {};
  if (configPath) {
    fileConfig = await readJsonConfig(configPath);
  }

  const audit =
    fileConfig.audit !== undefined
      ? Boolean(fileConfig.audit)
      : overrides.audit !== undefined
        ? overrides.audit
        : true;
  const failOnBuild =
    fileConfig.failOnBuild !== undefined
      ? Boolean(fileConfig.failOnBuild)
      : overrides.failOnBuild !== undefined
        ? overrides.failOnBuild
        : false;

  const compression = {
    gzip:
      fileConfig.compression?.gzip !== undefined
        ? Boolean(fileConfig.compression.gzip)
        : defaultCompression.gzip,
    brotli:
      fileConfig.compression?.brotli !== undefined
        ? Boolean(fileConfig.compression.brotli)
        : defaultCompression.brotli,
  };

  const thresholds: ResolvedThresholds = {
    enabled: Boolean(fileConfig.thresholds?.enabled),
    categories: fileConfig.thresholds?.categories ?? {},
  };

  const outputRel =
    fileConfig.outputDir ?? overrides.outputDir ?? "bundlelens";

  const buildDirAbs = resolveBuildDirAbs(
    cwd,
    configPath,
    fileConfig.buildDir,
    overrides.buildDir
  );

  return {
    buildCommand:
      fileConfig.buildCommand ?? overrides.buildCommand ?? undefined,
    buildDir: buildDirAbs,
    outputDir: path.resolve(cwd, outputRel),
    audit,
    failOnBuild,
    compression,
    thresholds,
    configPath,
    compare: fileConfig.compare,
    install: fileConfig.install,
  };
}
