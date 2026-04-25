import fs from "node:fs/promises";
import path from "node:path";
import type {
  BundleLensConfig,
  ResolvedConfig,
  ResolvedThresholds,
} from "../types/config.js";

export const BUNDLELENS_CONFIG_FILENAME = "bundlelens.config.json";

const DEFAULT_CONFIG_NAMES = [BUNDLELENS_CONFIG_FILENAME];

const defaultCompression = { gzip: true, brotli: true };

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
    } catch {
      /* continue */
    }
  }
  return undefined;
}

async function readJsonConfig(filePath: string): Promise<BundleLensConfig> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as BundleLensConfig;
}

/** Ruta absoluta al directorio de build, o undefined si no se definió. */
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

export type CliOverrides = {
  buildCommand?: string;
  buildDir?: string;
  outputDir?: string;
  audit?: boolean;
  /** Si se define, sustituye `failOnBuild` del archivo de configuración. */
  failOnBuild?: boolean;
  configPath?: string;
};

export async function resolveConfig(
  cwd: string,
  overrides: CliOverrides
): Promise<ResolvedConfig> {
  const configPath = await findConfigFile(cwd, overrides.configPath);
  let fileConfig: BundleLensConfig = {};
  if (configPath) {
    fileConfig = await readJsonConfig(configPath);
  }

  let audit: boolean;
  if (fileConfig.audit !== undefined) {
    audit = Boolean(fileConfig.audit);
  } else if (overrides.audit !== undefined) {
    audit = overrides.audit;
  } else {
    audit = true;
  }

  let failOnBuild: boolean;
  if (fileConfig.failOnBuild !== undefined) {
    failOnBuild = Boolean(fileConfig.failOnBuild);
  } else if (overrides.failOnBuild !== undefined) {
    failOnBuild = overrides.failOnBuild;
  } else {
    failOnBuild = false;
  }

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
