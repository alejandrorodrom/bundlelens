import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensConfig } from "../types/config.js";
import { BUNDLELENS_CONFIG_FILENAME } from "../utils/config.js";
import { pathExists } from "../utils/pathExists.js";

const BUILD_DIR_CANDIDATES = ["dist", "build", "out", ".next"] as const;
const BUNDLELENS_SCHEMA_URL = "./bundlelens.schema.json";

/**
 * @param abs - Absolute filesystem path.
 * @returns Whether `stat` succeeds and the path is a directory.
 */
async function pathIsDir(abs: string): Promise<boolean> {
  try {
    const st = await fs.stat(abs);
    return st.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Picks the first existing candidate folder name under `cwd`, else `"dist"`.
 *
 * @param cwd - Project root to probe.
 * @returns Relative build output directory name for the scaffolded config.
 */
async function detectBuildDir(cwd: string): Promise<string> {
  for (const name of BUILD_DIR_CANDIDATES) {
    if (await pathIsDir(path.join(cwd, name))) {
      return name;
    }
  }
  return "dist";
}

/**
 * Suggests a default `buildCommand` for new configs from `package.json` and lockfiles.
 *
 * @param cwd - Project root containing `package.json`.
 * @returns Example shell command (prefers the package manager implied by lockfiles when `build` exists).
 */
async function detectBuildCommandExample(cwd: string): Promise<string> {
  const hasBuildScript: boolean = await (async () => {
    try {
      const raw = await fs.readFile(path.join(cwd, "package.json"), "utf8");
      const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
      return Boolean(pkg.scripts?.build?.trim());
    } catch {
      return false;
    }
  })();
  if (!hasBuildScript) {
    return "npm run build";
  }
  const p = (...parts: string[]) => path.join(cwd, ...parts);
  if (await pathExists(p("pnpm-lock.yaml"))) {
    return "pnpm run build";
  }
  if (await pathExists(p("yarn.lock"))) {
    return "yarn build";
  }
  if (await pathExists(p("bun.lockb")) || await pathExists(p("bun.lock"))) {
    return "bun run build";
  }
  return "npm run build";
}

/**
 * Normalizes a report output path segment for `.gitignore` matching.
 *
 * @param dir - Raw output directory (may include slashes).
 * @returns Trimmed relative segment, defaulting to `bundlelens`.
 */
function normalizeOutputDirForGitignore(dir: string): string {
  const trimmed = dir.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed || "bundlelens";
}

/**
 * @param line - Single `.gitignore` line (comments/blank handled).
 * @param dir - Normalized report directory name.
 * @returns Whether the line ignores that directory (exact, `/**`, or prefix).
 */
function lineIgnoresDir(line: string, dir: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith("#")) {
    return false;
  }
  const noBang = t.startsWith("!") ? t.slice(1) : t;
  const normalized = noBang.replace(/^\//, "").replace(/\/+$/, "");
  return normalized === dir || normalized === `${dir}/**` || normalized.startsWith(`${dir}/`);
}

/**
 * @param content - Full `.gitignore` file text.
 * @param outputDir - Report directory name or path segment.
 * @returns True if any line already ignores `outputDir`.
 */
function gitignoreAlreadyIgnoresOutput(
  content: string,
  outputDir: string
): boolean {
  const dir = normalizeOutputDirForGitignore(outputDir);
  for (const line of content.split(/\r?\n/)) {
    if (lineIgnoresDir(line, dir)) {
      return true;
    }
  }
  return false;
}

/**
 * Appends a standard ignore block for the BundleLens report folder when needed.
 *
 * @param cwd - Project root (where `.gitignore` lives).
 * @param outputDir - Report directory to ignore (normalized internally).
 * @returns Whether a write occurred plus optional path/reason metadata.
 */
async function appendBundlelensToGitignore(
  cwd: string,
  outputDir: string
): Promise<{ appended: boolean; path?: string; reason?: string }> {
  const gitignorePath = path.join(cwd, ".gitignore");
  let content: string;
  try {
    content = await fs.readFile(gitignorePath, "utf8");
  } catch {
    return { appended: false, reason: "no .gitignore" };
  }

  const dir = normalizeOutputDirForGitignore(outputDir);
  if (gitignoreAlreadyIgnoresOutput(content, dir)) {
    return { appended: false, path: gitignorePath, reason: "already ignored" };
  }

  const needsNl = content.length > 0 && !content.endsWith("\n");
  const block = `${needsNl ? "\n" : ""}\n# bundlelens (informe HTML/JSON)\n${dir}/\n`;
  await fs.appendFile(gitignorePath, block, "utf8");
  return { appended: true, path: gitignorePath };
}

/**
 * Default JSON object written by `bundlelens init`.
 *
 * @param buildDir - Detected or fallback build output folder.
 * @param outputDir - Report output folder written into config.
 * @param buildCommandExample - Suggested shell build command.
 * @returns Serializable `BundleLensConfig`.
 */
function buildInitConfig(
  buildDir: string,
  outputDir: string,
  buildCommandExample: string
): BundleLensConfig {
  return {
    $schema: BUNDLELENS_SCHEMA_URL,
    buildCommand: buildCommandExample,
    buildDir,
    outputDir,
    audit: true,
    install: {
      command: "npm install",
    },
    compression: {
      gzip: true,
      brotli: true,
    },
    thresholds: {
      enabled: false,
      categories: {
        javascript: {
          maxFileRawBytes: 500_000,
          maxFileGzipBytes: 150_000,
        },
        css: {
          maxTotalGzipBytes: 100_000,
        },
      },
    },
  };
}

type InitOptions = {
  cwd: string;
  force?: boolean;
  outputDir?: string;
  skipGitignore?: boolean;
};

/**
 * Scaffolds `bundlelens.config.json` and optionally updates `.gitignore` for the report dir.
 *
 * @param options - `cwd`, overwrite `force`, `skipGitignore`, and optional `outputDir`.
 *
 * @remarks Sets `process.exitCode` when the config file already exists and `--force` was not passed.
 */
export async function runInit(options: InitOptions): Promise<void> {
  const { cwd, force, skipGitignore } = options;
  const outputRel = options.outputDir?.trim() || "bundlelens";

  const configPath = path.join(cwd, BUNDLELENS_CONFIG_FILENAME);
  if (!force) {
    try {
      await fs.access(configPath);
      console.error(
        `${BUNDLELENS_CONFIG_FILENAME} already exists. Use --force to overwrite.`
      );
      process.exitCode = 1;
      return;
    } catch {}
  }

  const buildDir = await detectBuildDir(cwd);
  const buildCommandExample = await detectBuildCommandExample(cwd);
  const config = buildInitConfig(buildDir, outputRel, buildCommandExample);

  await fs.writeFile(
    configPath,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
  console.log(`Created ${configPath}`);

  if (skipGitignore) {
    return;
  }

  const gi = await appendBundlelensToGitignore(cwd, outputRel);
  if (gi.appended && gi.path) {
    console.log(`Updated ${gi.path} (${normalizeOutputDirForGitignore(outputRel)}/)`);
  } else if (gi.path && gi.reason === "already ignored") {
    console.log(`${gi.path} already ignores report output; skipped.`);
  }
}
