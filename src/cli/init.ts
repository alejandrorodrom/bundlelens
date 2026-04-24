import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensConfig } from "../types/config.js";
import { BUNDLELENS_CONFIG_FILENAME } from "../utils/config.js";

const BUILD_DIR_CANDIDATES = ["dist", "build", "out", ".next"] as const;

async function pathIsDir(abs: string): Promise<boolean> {
  try {
    const st = await fs.stat(abs);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function detectBuildDir(cwd: string): Promise<string> {
  for (const name of BUILD_DIR_CANDIDATES) {
    if (await pathIsDir(path.join(cwd, name))) {
      return name;
    }
  }
  return "dist";
}

async function detectBuildCommandExample(cwd: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    if (pkg.scripts?.build?.trim()) {
      return "npm run build";
    }
  } catch {
    /* no package.json or invalid */
  }
  return "npm run build";
}

function normalizeOutputDirForGitignore(dir: string): string {
  const trimmed = dir.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed || "bundlelens";
}

/** True if this line (gitignore rule) already ignores the given directory path. */
function lineIgnoresDir(line: string, dir: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith("#")) {
    return false;
  }
  const noBang = t.startsWith("!") ? t.slice(1) : t;
  const normalized = noBang.replace(/^\//, "").replace(/\/+$/, "");
  return normalized === dir || normalized === `${dir}/**` || normalized.startsWith(`${dir}/`);
}

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

function buildInitConfig(
  buildDir: string,
  outputDir: string,
  buildCommandExample: string
): BundleLensConfig {
  return {
    buildCommand: buildCommandExample,
    buildDir,
    outputDir,
    audit: true,
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
    } catch {
      /* ok */
    }
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
  } else if (gi.reason === "no .gitignore") {
    /* omitido a petición: solo si existe */
  } else if (gi.path && gi.reason === "already ignored") {
    console.log(`${gi.path} already ignores report output; skipped.`);
  }
}
