import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { search } from "@inquirer/prompts";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { runBuild } from "../core/runBuild.js";
import { writeCompareHtmlReport } from "../reporters/compareHtml.js";
import type { BundleLensCompareReport, BundleLensReport } from "../types/report.js";
import { auditFromArgv, failOnBuildFromArgv } from "../utils/cliArgv.js";
import { resolveConfig } from "../utils/config.js";
import { ensureDependenciesIfNeeded } from "../utils/dependencies.js";
import { ensureNpmrcPackageLockTrue } from "../utils/npmrcPackageLock.js";
import {
  getGitRoot,
  listGitRefsForSearch,
  prepareWorktreeForRef,
} from "../utils/git.js";
import { createSpinner } from "../utils/spinner.js";
import { isInteractiveTerminal } from "../utils/tty.js";
import { readBundleLensVersion } from "../utils/version.js";
import { pathExists } from "../utils/pathExists.js";
import { resolvePathInCwd } from "../utils/pathResolve.js";
import { printAnalyzerNotices, promptRequiredValue } from "./shared.js";

/** Options for `runCompare` (project cwd, argv, and optional CLI overrides). */
export type CompareCliOptions = {
  cwd: string;
  argv: string[];
  baseFlag?: string;
  headFlag?: string;
  buildCommandFlag?: string;
  buildDirFlag?: string;
  /** Overrides `install.command` from config when set (both compare sides). */
  installCommandFlag?: string;
  outputFlag?: string;
  configFlag?: string;
  audit?: boolean;
  failOnBuild?: boolean;
};
type ComparePromptHooks = {
  pause: () => void;
  resume: () => void;
};

/**
 * Writes a green check (or plain text) plus a line to stdout.
 *
 * @param message - Status line without trailing newline.
 */
function printCheckLine(message: string): void {
  const ok = process.stdout.isTTY ? "\x1b[32m✔\x1b[0m" : "✔";
  process.stdout.write(`${ok} ${message}\n`);
}

/**
 * Maps the resolved config file path from the main repo into another worktree root.
 *
 * @param options - `gitRoot`, worktree `checkoutRoot`, and resolved config path from main cwd.
 * @returns Absolute config path inside the worktree, or `undefined` when unset/outside repo.
 */
function configPathInCheckout(options: {
  gitRoot: string;
  checkoutRoot: string;
  resolvedConfigPath: string | undefined;
}): string | undefined {
  const abs = options.resolvedConfigPath;
  if (!abs) return undefined;
  const rel = path.relative(options.gitRoot, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return abs;
  }
  return path.join(options.checkoutRoot, rel);
}

/**
 * Git worktrees only contain **tracked** files. `bundlelens.config.json` is often untracked
 * or not yet pushed, so the path mapped into the checkout may not exist. In that case we
 * fall back to the config file from the main working tree so `buildCommand` / `buildDir`
 * / `install` still load without spurious prompts.
 *
 * @param options - Worktree cwd, path under checkout, and resolved config path from `cwd`.
 * @returns Absolute path to an existing JSON file, or `undefined` to let `resolveConfig` discover.
 */
async function configPathForCompareWorktree(options: {
  worktreeCwd: string;
  mappedInCheckout: string | undefined;
  mainResolvedConfigPath: string | undefined;
}): Promise<string | undefined> {
  const tryAccess = async (p: string | undefined): Promise<string | undefined> => {
    if (!p?.trim()) return undefined;
    const abs = path.isAbsolute(p)
      ? path.normalize(p)
      : path.resolve(options.worktreeCwd, p);
    return (await pathExists(abs)) ? abs : undefined;
  };
  return (
    (await tryAccess(options.mappedInCheckout)) ??
    (await tryAccess(options.mainResolvedConfigPath))
  );
}

/**
 * Interactive fuzzy picker over Git refs.
 *
 * @param message - Inquirer prompt title.
 * @param choices - Candidate ref names.
 * @returns Selected ref string.
 */
async function pickBranch(
  message: string,
  choices: string[]
): Promise<string> {
  if (choices.length === 0) {
    throw new Error(
      "No branches found with `git for-each-ref`. Are you inside a Git repository?"
    );
  }
  const picked = await search({
    message,
    pageSize: 12,
    source: async (term) => {
      const t = (term || "").toLowerCase().trim();
      if (!t) return choices.slice(0, 80);
      return choices.filter((c) => c.toLowerCase().includes(t)).slice(0, 80);
    },
  });
  return String(picked).trim();
}

/**
 * Resolves base/head refs from config, flags, and optional interactive prompts.
 *
 * @param options - Branch list plus optional config/flag overrides.
 * @returns Distinct `base` and `head` ref strings.
 */
async function resolveRefs(options: {
  cwd: string;
  configBase?: string;
  configHead?: string;
  flagBase?: string;
  flagHead?: string;
  branches: string[];
}): Promise<{ base: string; head: string }> {
  const fromCfgB = options.configBase?.trim();
  const fromCfgH = options.configHead?.trim();
  const fromFlagB = options.flagBase?.trim();
  const fromFlagH = options.flagHead?.trim();

  let base = fromCfgB || fromFlagB;
  let head = fromCfgH || fromFlagH;

  if (!base && isInteractiveTerminal()) {
    base = await pickBranch("Base branch or ref", options.branches);
  }
  if (!head && isInteractiveTerminal()) {
    head = await pickBranch("Head branch or ref (changes)", options.branches);
  }

  if (!base || !head) {
    throw new Error(
      "Set both branches: use --base and --head, add a `compare` block in bundlelens.config.json, or run in an interactive terminal."
    );
  }

  if (base.trim() === head.trim()) {
    throw new Error("Base and head branches must be different.");
  }

  return { base, head };
}

/**
 * Resolves side config, installs deps if needed, runs build, and analyzes one compare side.
 *
 * Same precedence as `bundlelens run` (config file → CLI flags; `buildCommand` / `buildDir`
 * prompt if still missing). Uses the checkout’s `bundlelens.config.json` when present; if the
 * worktree has no copy (often untracked / not committed), falls back to the main tree config
 * path. `outputDir` merges like run (then default `bundlelens`). Install:
 * `install.command` from file, then
 * `--install-command`, then the interactive picker (`ensureDependenciesIfNeeded`).
 *
 * @param options - Worktree paths, audit/fail flags, and status callback.
 * @returns Report, build failure flag, and resolved build paths/commands for reuse.
 */
async function runOneSide(options: {
  label: string;
  worktreeCwd: string;
  checkoutRoot: string;
  gitRoot: string;
  config: Awaited<ReturnType<typeof resolveConfig>>;
  buildCommandFlag?: string;
  buildDirFlag?: string;
  outputDirFlag?: string;
  audit: boolean;
  failOnBuild: boolean;
  onStatus: (msg: string) => void;
  /** Same role as `run`: overrides `install.command` from file after merge. */
  installCommandFlag?: string;
  promptHooks?: ComparePromptHooks;
}): Promise<{
  report: BundleLensReport;
  buildFailed: boolean;
  resolvedBuildCommand: string;
  resolvedBuildDirAbs: string;
  resolvedInstallCommand?: string;
}> {
  const {
    worktreeCwd,
    checkoutRoot,
    gitRoot,
    config,
    buildCommandFlag,
    buildDirFlag,
    outputDirFlag,
    audit,
    failOnBuild,
    onStatus,
    installCommandFlag,
    promptHooks,
  } = options;

  const mappedInCheckout = configPathInCheckout({
    gitRoot,
    checkoutRoot,
    resolvedConfigPath: config.configPath,
  });
  const effectiveConfigPath = await configPathForCompareWorktree({
    worktreeCwd,
    mappedInCheckout,
    mainResolvedConfigPath: config.configPath,
  });

  const sideConfig = await resolveConfig(worktreeCwd, {
    outputDir: outputDirFlag?.trim() || undefined,
    audit,
    failOnBuild,
    configPath: effectiveConfigPath,
    buildCommand: buildCommandFlag?.trim() || undefined,
    buildDir: buildDirFlag?.trim() || undefined,
  });

  let cmd = sideConfig.buildCommand?.trim();
  if (!cmd) {
    cmd = await promptRequiredValue({
      message: `${options.label}: missing build command in config/flags. Enter command (e.g. npm run build)`,
      validateMessage: "Build command is required.",
      nonInteractiveErrorMessage: `${options.label}: missing buildCommand: set it in bundlelens.config.json for this ref, pass --build-command, or run in an interactive terminal.`,
      onBeforePrompt: () => promptHooks?.pause(),
      onAfterPrompt: () => promptHooks?.resume(),
    });
  }
  let buildDirAbs = sideConfig.buildDir;
  if (!buildDirAbs) {
    const rawBuildDir = await promptRequiredValue({
      message: `${options.label}: missing buildDir in config/flags. Enter build output directory (e.g. dist, .next, out)`,
      validateMessage: "buildDir is required.",
      nonInteractiveErrorMessage: `${options.label}: missing buildDir: set it in bundlelens.config.json for this ref, pass --build-dir, or run in an interactive terminal.`,
      onBeforePrompt: () => promptHooks?.pause(),
      onAfterPrompt: () => promptHooks?.resume(),
    });
    buildDirAbs = resolvePathInCwd(rawBuildDir, worktreeCwd);
  }

  const preferredInstallCommand =
    sideConfig.install?.command?.trim() ||
    installCommandFlag?.trim() ||
    undefined;

  onStatus(`${options.label}: preparing dependencies…`);
  await ensureNpmrcPackageLockTrue(worktreeCwd);
  const resolvedInstallCommand = await ensureDependenciesIfNeeded({
    label: options.label,
    cwd: worktreeCwd,
    onStatus,
    preferredCommand: preferredInstallCommand,
    onBeforeInteractivePrompt: () => promptHooks?.pause(),
    onAfterInteractivePrompt: () => promptHooks?.resume(),
  });

  onStatus(`${options.label}: running build…`);
  const { build } = await runBuild(cmd, worktreeCwd, sideConfig.outputDir);

  const buildFailed =
    typeof build.exitCode === "number" && build.exitCode !== 0;
  if (buildFailed && failOnBuild) {
    throw new Error(
      `${options.label}: build exited with code ${build.exitCode}.`
    );
  }

  onStatus(`${options.label}: analyzing artifacts…`);
  const report = await analyzeBuildDir({
    mode: "run",
    buildDirAbs,
    outputDirAbs: sideConfig.outputDir,
    config: { ...sideConfig, audit },
    build,
    npmAuditCwd: worktreeCwd,
    npmAuditCeiling: checkoutRoot,
    onStatus: (m) => {
      let line = m;
      if (m.startsWith("Indexing files")) {
        line = "Indexing files…";
      }
      onStatus(`${options.label}: ${line}`);
    },
  });
  onStatus(`${options.label}: analysis completed.`);

  return {
    report,
    buildFailed,
    resolvedBuildCommand: cmd,
    resolvedBuildDirAbs: buildDirAbs,
    resolvedInstallCommand,
  };
}

/**
 * Compares two Git refs via detached worktrees, builds each side, and writes `compare.html`.
 *
 * @param options - Project `cwd`, `argv` for flag parsing, and optional CLI overrides.
 */
export async function runCompare(options: CompareCliOptions): Promise<void> {
  const { cwd, argv } = options;
  const gitRoot = await getGitRoot(cwd);
  if (!gitRoot) {
    throw new Error("Not a Git repository (git rev-parse failed).");
  }

  const branches = await listGitRefsForSearch(gitRoot);

  const config = await resolveConfig(cwd, {
    buildCommand: options.buildCommandFlag?.trim() || undefined,
    buildDir: options.buildDirFlag?.trim() || undefined,
    outputDir: options.outputFlag?.trim() || undefined,
    audit: options.audit ?? auditFromArgv(argv),
    failOnBuild: options.failOnBuild ?? failOnBuildFromArgv(argv),
    configPath: options.configFlag,
  });

  const { base, head } = await resolveRefs({
    cwd,
    branches,
    flagBase: options.baseFlag,
    flagHead: options.headFlag,
    configBase: config.compare?.baseBranch,
    configHead: config.compare?.headBranch,
  });
  const outputDirAbs = path.join(config.outputDir, "compare");

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bundlelens-cmp-"));
  const cleanups: Array<() => Promise<void>> = [];
  const spin = createSpinner();
  let lastSpinMessage = "Comparing…";
  const setSpinMsg = (msg: string): void => {
    lastSpinMessage = msg;
    spin.update(msg);
  };
  const promptHooks: ComparePromptHooks = {
    pause: () => {
      spin.stop();
    },
    resume: () => {
      spin.start(lastSpinMessage);
    },
  };

  try {
    spin.start("Preparing base worktree…");
    const baseWt = await prepareWorktreeForRef({
      gitRoot,
      projectCwd: cwd,
      ref: base,
      tempParentDir: tmpRoot,
      slotName: "wt-base",
    });
    cleanups.push(baseWt.remove);
    setSpinMsg(`Base worktree ready (${base}).`);

    setSpinMsg("Preparing head worktree…");
    const headWt = await prepareWorktreeForRef({
      gitRoot,
      projectCwd: cwd,
      ref: head,
      tempParentDir: tmpRoot,
      slotName: "wt-head",
    });
    cleanups.push(headWt.remove);
    setSpinMsg(`Head worktree ready (${head}).`);

    spin.start(`Analyzing base (${base})…`);
    const { report: baseReport, buildFailed: baseFailed } = await runOneSide({
      label: `base (${base})`,
      worktreeCwd: baseWt.cwd,
      checkoutRoot: baseWt.root,
      gitRoot,
      config,
      buildCommandFlag: options.buildCommandFlag,
      buildDirFlag: options.buildDirFlag,
      outputDirFlag: options.outputFlag,
      audit: config.audit,
      failOnBuild: config.failOnBuild,
      onStatus: setSpinMsg,
      installCommandFlag: options.installCommandFlag,
      promptHooks,
    });
    spin.stop();
    printCheckLine(`Base analyzed (${base})`);

    spin.start(`Analyzing head (${head})…`);
    const { report: headReport, buildFailed: headFailed } = await runOneSide({
      label: `head (${head})`,
      worktreeCwd: headWt.cwd,
      checkoutRoot: headWt.root,
      gitRoot,
      config,
      buildCommandFlag: options.buildCommandFlag,
      buildDirFlag: options.buildDirFlag,
      outputDirFlag: options.outputFlag,
      audit: config.audit,
      failOnBuild: config.failOnBuild,
      onStatus: setSpinMsg,
      installCommandFlag: options.installCommandFlag,
      promptHooks,
    });
    spin.stop();
    printCheckLine(`Head analyzed (${head})`);

    printAnalyzerNotices(baseReport.metadata.analysisNotices, {
      headingAfterIcon: `base (${base}) analyzer notices`,
      trailingBlankLine: false,
    });
    printAnalyzerNotices(headReport.metadata.analysisNotices, {
      headingAfterIcon: `head (${head}) analyzer notices`,
      trailingBlankLine: false,
    });
    if (
      (baseReport.summary?.totalFiles ?? 0) === 0 &&
      (headReport.summary?.totalFiles ?? 0) === 0
    ) {
      console.warn("");
      console.warn(
        "⚠ Both sides indexed 0 files. Usually this means buildDir is wrong for one/both branches, build output is empty, or read/access failed."
      );
    }

    const payload: BundleLensCompareReport = {
      _bundlelensCompare: true,
      bundlelensVersion: readBundleLensVersion(),
      generatedAt: new Date().toISOString(),
      baseRef: base,
      headRef: head,
      base: baseReport,
      head: headReport,
    };

    spin.start("Writing compare report…");
    await fs.mkdir(outputDirAbs, { recursive: true });
    await writeCompareHtmlReport(payload, outputDirAbs);
    spin.stop();
    printCheckLine("Compare report written.");

    console.log(`Compare report: ${path.join(outputDirAbs, "compare.html")}`);
    console.log(`JSON: ${path.join(outputDirAbs, "compare-report.json")}`);

    if (config.failOnBuild && (baseFailed || headFailed)) {
      process.exitCode = 1;
    } else if (baseFailed || headFailed) {
      console.warn(
        "One or more builds failed; the compare report was still written (set failOnBuild in config or use --fail-on-build to exit non-zero)."
      );
    }
  } catch (e) {
    spin.fail(e instanceof Error ? e.message : "Error while running compare");
    throw e;
  } finally {
    spin.stop();
    for (const fn of cleanups.reverse()) {
      try {
        await fn();
      } catch {}
    }
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {}
  }
}
