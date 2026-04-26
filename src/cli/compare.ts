import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { input, search } from "@inquirer/prompts";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { runBuild } from "../core/runBuild.js";
import { writeCompareHtmlReport } from "../reporters/compareHtml.js";
import type { BundleLensCompareReport, BundleLensReport } from "../types/report.js";
import { auditFromArgv, failOnBuildFromArgv } from "../utils/cliArgv.js";
import { resolveConfig } from "../utils/config.js";
import { ensureDependenciesIfNeeded } from "../utils/dependencies.js";
import {
  getGitRoot,
  listGitRefsForSearch,
  prepareWorktreeForRef,
} from "../utils/git.js";
import { createSpinner } from "../utils/spinner.js";
import { isInteractiveTerminal } from "../utils/tty.js";
import { readBundleLensVersion } from "../utils/version.js";
import { resolvePathInCwd } from "../utils/pathResolve.js";
import { printAnalyzerNotices } from "./shared.js";

/** Options for `runCompare` (project cwd, argv, and optional CLI overrides). */
export type CompareCliOptions = {
  cwd: string;
  argv: string[];
  baseFlag?: string;
  headFlag?: string;
  buildCommandFlag?: string;
  buildDirFlag?: string;
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
 * Re-expresses an absolute `buildDir` from one checkout as relative to another when safe.
 *
 * @param resolvedAbs - Absolute build directory from the first side.
 * @param originWorktreeCwd - Worktree cwd used when `resolvedAbs` was produced.
 * @returns Relative path, `"."`, or the original absolute path when not under `originWorktreeCwd`.
 */
function buildDirHintRelativeToCheckout(
  resolvedAbs: string,
  originWorktreeCwd: string
): string {
  const abs = path.normalize(path.resolve(resolvedAbs));
  const origin = path.normalize(path.resolve(originWorktreeCwd));
  const rel = path.relative(origin, abs);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel.length === 0 ? "." : rel;
  }
  return abs;
}

/**
 * Build directory override string passed into `resolveConfig` inside a worktree.
 *
 * @param options - Main project cwd, resolved main config, and optional CLI `buildDir` flag.
 * @returns Relative `buildDir` override, `undefined` when not derivable safely.
 */
function buildDirOverrideForWorktreeResolve(options: {
  projectCwdAbs: string;
  projectConfig: Awaited<ReturnType<typeof resolveConfig>>;
  buildDirFlag?: string;
}): string | undefined {
  const rawFlag = options.buildDirFlag?.trim();
  if (rawFlag) return rawFlag;
  const abs = options.projectConfig.buildDir;
  if (!abs) return undefined;
  const anchor = options.projectConfig.configPath
    ? path.dirname(options.projectConfig.configPath)
    : options.projectCwdAbs;
  const normalized = path.normalize(abs);
  let rel = path.relative(anchor, normalized);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    rel = path.relative(options.projectCwdAbs, normalized);
  }
  if (rel.startsWith("..") || path.isAbsolute(rel)) return undefined;
  return rel.length === 0 ? "." : rel;
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
 * @param options - Worktree paths, shared hints, audit/fail flags, and status callback.
 * @returns Report, build failure flag, and resolved build paths/commands for reuse.
 */
async function runOneSide(options: {
  label: string;
  worktreeCwd: string;
  checkoutRoot: string;
  gitRoot: string;
  outputScratchDir: string;
  config: Awaited<ReturnType<typeof resolveConfig>>;
  projectCwdAbs: string;
  buildDirFlag?: string;
  audit: boolean;
  failOnBuild: boolean;
  onStatus: (msg: string) => void;
  sharedBuildCommand?: string;
  sharedBuildDir?: string;
  sharedInstallCommand?: string;
  promptHooks?: ComparePromptHooks;
}): Promise<{
  report: BundleLensReport;
  buildFailed: boolean;
  resolvedBuildCommand: string;
  resolvedBuildDirAbs: string;
  resolvedInstallCommand?: string;
}> {
  const promptRequiredValue = async (args: {
    message: string;
    requiredMessage: string;
    validationMessage: string;
  }): Promise<string> => {
    if (!isInteractiveTerminal()) {
      throw new Error(args.requiredMessage);
    }
    promptHooks?.pause();
    try {
      return (
        await input({
          message: args.message,
          validate: (v) =>
            v.trim().length > 0 ? true : args.validationMessage,
        })
      ).trim();
    } finally {
      promptHooks?.resume();
    }
  };

  const {
    worktreeCwd,
    checkoutRoot,
    gitRoot,
    outputScratchDir,
    config,
    projectCwdAbs,
    buildDirFlag,
    audit,
    failOnBuild,
    onStatus,
    sharedBuildCommand,
    sharedBuildDir,
    sharedInstallCommand,
    promptHooks,
  } = options;

  const sideConfigPath = configPathInCheckout({
    gitRoot,
    checkoutRoot,
    resolvedConfigPath: config.configPath,
  });

  const sideConfig = await resolveConfig(worktreeCwd, {
    outputDir: outputScratchDir,
    audit,
    failOnBuild,
    configPath: sideConfigPath,
    buildDir: buildDirOverrideForWorktreeResolve({
      projectCwdAbs,
      projectConfig: config,
      buildDirFlag,
    }),
  });

  let cmd = sideConfig.buildCommand?.trim() || sharedBuildCommand?.trim();
  if (!cmd) {
    cmd = await promptRequiredValue({
      message: `${options.label}: build command not found in config. Enter command (e.g. npm run build)`,
      requiredMessage: `${options.label}: missing buildCommand in bundlelens.config.json (path: ${config.configPath ?? "—"}).`,
      validationMessage: "Build command is required.",
    });
  }
  let buildDirAbs = sideConfig.buildDir;
  if (!buildDirAbs && sharedBuildDir?.trim()) {
    buildDirAbs = resolvePathInCwd(sharedBuildDir, worktreeCwd);
  }
  if (!buildDirAbs) {
    const rawBuildDir = await promptRequiredValue({
      message: `${options.label}: buildDir not found in config. Enter build output directory (e.g. dist, .next, out)`,
      requiredMessage: `${options.label}: missing buildDir in config (same bundlelens.config.json as your project).`,
      validationMessage: "buildDir is required.",
    });
    buildDirAbs = resolvePathInCwd(rawBuildDir, worktreeCwd);
  }

  onStatus(`${options.label}: preparing dependencies…`);
  const resolvedInstallCommand = await ensureDependenciesIfNeeded({
    label: options.label,
    cwd: worktreeCwd,
    onStatus,
    preferredCommand: sideConfig.install?.command ?? sharedInstallCommand,
    onBeforeInteractivePrompt: () => promptHooks?.pause(),
    onAfterInteractivePrompt: () => promptHooks?.resume(),
  });

  onStatus(`${options.label}: running build…`);
  const { build } = await runBuild(cmd, worktreeCwd, outputScratchDir);

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
    outputDirAbs: outputScratchDir,
    config: { ...sideConfig, audit },
    build,
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
  const outputDirAbs = options.outputFlag
    ? resolvePathInCwd(options.outputFlag, cwd)
    : path.join(config.outputDir, "compare");

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

    const scratchBase = path.join(tmpRoot, "out-base");
    const scratchHead = path.join(tmpRoot, "out-head");
    const projectCwdAbs = path.resolve(cwd);

    spin.start(`Analyzing base (${base})…`);
    const {
      report: baseReport,
      buildFailed: baseFailed,
      resolvedBuildCommand: baseResolvedCmd,
      resolvedBuildDirAbs: baseResolvedBuildDirAbs,
      resolvedInstallCommand: baseResolvedInstallCmd,
    } = await runOneSide({
      label: `base (${base})`,
      worktreeCwd: baseWt.cwd,
      checkoutRoot: baseWt.root,
      gitRoot,
      outputScratchDir: scratchBase,
      config,
      projectCwdAbs,
      buildDirFlag: options.buildDirFlag,
      audit: config.audit,
      failOnBuild: config.failOnBuild,
      onStatus: setSpinMsg,
      sharedBuildCommand: config.buildCommand,
      sharedInstallCommand: config.install?.command,
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
      outputScratchDir: scratchHead,
      config,
      projectCwdAbs,
      buildDirFlag: options.buildDirFlag,
      audit: config.audit,
      failOnBuild: config.failOnBuild,
      onStatus: setSpinMsg,
      sharedBuildCommand: baseResolvedCmd,
      sharedBuildDir: buildDirHintRelativeToCheckout(
        baseResolvedBuildDirAbs,
        baseWt.cwd
      ),
      sharedInstallCommand: baseResolvedInstallCmd ?? config.install?.command,
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
