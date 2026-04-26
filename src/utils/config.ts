import fs from "node:fs/promises";
import path from "node:path";
import { pathExists } from "./pathExists.js";
import type {
  BundleLensConfig,
  ResolvedConfig,
  ResolvedThresholds,
} from "../types/config.js";

/** Default config file name in the project root. */
export const BUNDLELENS_CONFIG_FILENAME = "bundlelens.config.json";

const defaultCompression = { gzip: true, brotli: true };

function boolFromFileOrOverride(
  file: boolean | undefined,
  override: boolean | undefined,
  fallback: boolean
): boolean {
  if (file !== undefined) return Boolean(file);
  if (override !== undefined) return Boolean(override);
  return fallback;
}

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
    return (await pathExists(abs)) ? abs : undefined;
  }
  const defaultPath = path.join(cwd, BUNDLELENS_CONFIG_FILENAME);
  return (await pathExists(defaultPath)) ? defaultPath : undefined;
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
 * Resolves `buildDir`: file config is checked first (same precedence as `buildCommand` via `??`);
 * when the file omits `buildDir`, the CLI value is resolved relative to the config directory
 * when possible, otherwise `cwd`.
 *
 * @param cwd - Project cwd.
 * @param configPath - Absolute config file path, when any.
 * @param fileBuildDir - `buildDir` from the config file.
 * @param cliBuildDir - CLI `--build-dir` override.
 * @returns Absolute build directory, or `undefined`.
 */
function resolveBuildDirAbs(
  cwd: string,
  configPath: string | undefined,
  fileBuildDir: string | undefined,
  cliBuildDir: string | undefined
): string | undefined {
  const fromFile = fileBuildDir?.trim();
  if (fromFile) {
    return path.resolve(cwd, fromFile);
  }
  const fromCli = cliBuildDir?.trim();
  if (!fromCli) {
    return undefined;
  }
  if (path.isAbsolute(fromCli)) {
    return path.normalize(fromCli);
  }
  if (configPath) {
    return path.resolve(path.dirname(configPath), fromCli);
  }
  return path.resolve(cwd, fromCli);
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

  const audit = boolFromFileOrOverride(
    fileConfig.audit,
    overrides.audit,
    true
  );
  const failOnBuild = boolFromFileOrOverride(
    fileConfig.failOnBuild,
    overrides.failOnBuild,
    false
  );

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
