#!/usr/bin/env node
/**
 * CLI entrypoint for the `bundlelens` command (`run`, `analyze`, `compare`, `init`).
 */
import path from "node:path";
import process from "node:process";
import { input } from "@inquirer/prompts";
import { cac } from "cac";
import { auditFromArgv, failOnBuildFromArgv } from "../utils/cliArgv.js";
import { resolveConfig } from "../utils/config.js";
import { isInteractiveTerminal } from "../utils/tty.js";
import { readBundleLensVersion } from "../utils/version.js";
import { runBuild } from "../core/runBuild.js";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { generateReport } from "../core/generateReport.js";
import { createSpinner } from "../utils/spinner.js";
import { ensureDependenciesIfNeeded } from "../utils/dependencies.js";
import { printTerminalSummary } from "../utils/terminalSummary.js";
import { runInit } from "./init.js";
import { runCompare } from "./compare.js";

/**
 * Prints non-fatal analyzer lines to stderr with a warning prefix.
 *
 * @param notices - Human-readable notice strings (empty skips output).
 */
function printAnalyzerNotices(notices: string[]): void {
  if (notices.length === 0) return;
  const warningIcon = process.stderr.isTTY ? "\x1b[33m⚠\x1b[0m" : "⚠";
  console.warn("");
  console.warn(`${warningIcon} Analyzer notices`);
  for (const n of notices) {
    console.warn(`  - ${n}`);
  }
  console.warn("");
}

/**
 * Prompts for a non-empty string; throws `validateMessage` when not interactive.
 *
 * @param options - Inquirer message and validation error text.
 * @returns Trimmed non-empty string from the user.
 */
async function promptRequiredValue(options: {
  message: string;
  validateMessage: string;
}): Promise<string> {
  if (!isInteractiveTerminal()) {
    throw new Error(options.validateMessage);
  }
  return (
    await input({
      message: options.message,
      validate: (v) => (v.trim().length > 0 ? true : options.validateMessage),
    })
  ).trim();
}

const cli = cac("bundlelens");

cli
  .command(
    "run [buildCommand]",
    "Run the build command and analyze output (command optional if set in config)"
  )
  .option("--build-dir <dir>", "Build output directory to analyze")
  .option("--output <dir>", "Report output directory (default: ./bundlelens)")
  .option("--config <file>", "Path to bundlelens.config.json")
  .option(
    "--audit",
    "Run npm audit (on by default; use to override audit:false in config)"
  )
  .option("--no-audit", "Skip npm audit for this run")
  .option(
    "--fail-on-build",
    "Exit with the build command's non-zero exit code (off by default; see failOnBuild in config)"
  )
  .option(
    "--no-fail-on-build",
    "Do not propagate build exit code even if failOnBuild is true in config"
  )
  .action(async (buildCommand: string | undefined, options: Record<string, unknown>) => {
    const cwd = process.cwd();
    const argv = process.argv;
    const cliCmd = buildCommand?.trim();
    const config = await resolveConfig(cwd, {
      buildCommand: cliCmd || undefined,
      buildDir: options.buildDir as string | undefined,
      outputDir: options.output as string | undefined,
      audit: auditFromArgv(argv),
      failOnBuild: failOnBuildFromArgv(argv),
      configPath: options.config as string | undefined,
    });

    let resolvedCmd = config.buildCommand?.trim();
    if (!resolvedCmd) {
      try {
        resolvedCmd = await promptRequiredValue({
          message:
            'Missing build command in config/flags. Enter build command (e.g. "npm run build")',
          validateMessage: "Build command is required.",
        });
      } catch {
        console.error(
          'Missing build command: set buildCommand in bundlelens.config.json, pass `bundlelens run "<cmd>"`, or run in an interactive terminal.'
        );
        process.exitCode = 1;
        return;
      }
    }

    let buildDirAbs = config.buildDir;
    if (!buildDirAbs) {
      try {
        const raw = await promptRequiredValue({
          message:
            "Missing buildDir in config/flags. Enter build output directory (e.g. dist, .next, out)",
          validateMessage: "buildDir is required.",
        });
        buildDirAbs = path.resolve(cwd, raw);
      } catch {
        console.error(
          "Missing build directory: set buildDir in bundlelens.config.json, pass --build-dir, or run in an interactive terminal."
        );
        process.exitCode = 1;
        return;
      }
    }

    const outputDirAbs = config.outputDir;

    const spin = createSpinner();
    spin.start("Running build command…");
    let build;
    try {
      await ensureDependenciesIfNeeded({
        label: "run",
        cwd,
        onStatus: (msg) => spin.update(msg),
        preferredCommand: config.install?.command,
      });
      const result = await runBuild(resolvedCmd, cwd, outputDirAbs);
      build = result.build;
      const secs = (build.durationMs / 1000).toFixed(1);
      const ok = build.exitCode === 0 || build.exitCode === null;
      spin.stop(
        ok
          ? `Build finished in ${secs}s`
          : `Build exited with code ${build.exitCode} (${secs}s)`
      );

      spin.start("Analyzing build output…");
      const report = await analyzeBuildDir({
        mode: "run",
        buildDirAbs,
        outputDirAbs,
        config,
        build,
        onStatus: (msg) => {
          spin.update(msg);
        },
      });
      spin.stop("Build output analysis complete");
      const notices = report.metadata.analysisNotices ?? [];
      printAnalyzerNotices(notices);

      spin.start("Writing report…");
      await generateReport(report, outputDirAbs);
      spin.stop("Report written.");
      printTerminalSummary(report);
    } catch (e) {
      spin.fail(e instanceof Error ? e.message : "Error while running bundlelens");
      process.exitCode = 1;
      return;
    }

    if (
      config.failOnBuild &&
      typeof build.exitCode === "number" &&
      build.exitCode !== 0
    ) {
      process.exitCode = build.exitCode;
    }
  });

cli
  .command(
    "analyze [buildDir]",
    "Analyze an existing build output directory"
  )
  .option(
    "--build-dir <dir>",
    "Build output directory (if you omit the positional argument)"
  )
  .option("--output <dir>", "Report output directory (default: ./bundlelens)")
  .option("--config <file>", "Path to bundlelens.config.json")
  .option(
    "--audit",
    "Run npm audit (on by default; use to override audit:false in config)"
  )
  .option("--no-audit", "Skip npm audit for this run")
  .action(async (buildDir: string | undefined, options: Record<string, unknown>) => {
    const cwd = process.cwd();
    const argv = process.argv;
    const fromPos = buildDir?.trim();
    const fromFlag = (options.buildDir as string | undefined)?.trim();
    const cliBuildDir = fromPos || fromFlag || undefined;
    const config = await resolveConfig(cwd, {
      buildDir: cliBuildDir,
      outputDir: options.output as string | undefined,
      audit: auditFromArgv(argv),
      configPath: options.config as string | undefined,
    });

    let buildDirAbs = config.buildDir;
    if (!buildDirAbs) {
      try {
        const raw = await promptRequiredValue({
          message:
            "Missing buildDir in config/flags. Enter build output directory (e.g. dist, .next, out)",
          validateMessage: "buildDir is required.",
        });
        buildDirAbs = path.resolve(cwd, raw);
      } catch {
        console.error(
          "Missing build directory: use analyze <dir>, --build-dir, set buildDir in bundlelens.config.json, or run in an interactive terminal."
        );
        process.exitCode = 1;
        return;
      }
    }

    const outputDirAbs = config.outputDir;

    const report = await analyzeBuildDir({
      mode: "analyze",
      buildDirAbs,
      outputDirAbs,
      config,
      build: null,
    });
    const notices = report.metadata.analysisNotices ?? [];
    printAnalyzerNotices(notices);
    const { filesPath } = await generateReport(report, outputDirAbs);
    printTerminalSummary(report);
    console.log(`Report: ${outputDirAbs}/index.html`);
    console.log(`Rankings: ${outputDirAbs}/rankings.html`);
    if (filesPath) {
      console.log(`Files: ${outputDirAbs}/files.html`);
    }
  });

cli
  .command(
    "compare",
    "Build and analyze two Git branches side by side (worktrees + compare report)"
  )
  .option("--base <ref>", "Git base branch or ref")
  .option("--head <ref>", "Git head branch or ref (changes)")
  .option(
    "--build-command <cmd>",
    "Build command to use for both sides in compare (fallback when branch config is missing)"
  )
  .option(
    "--build-dir <dir>",
    "Build output directory to use for both sides in compare (fallback when branch config is missing)"
  )
  .option(
    "--output <dir>",
    "Compare report output directory (default: <outputDir>/compare from config)"
  )
  .option("--config <file>", "Path to bundlelens.config.json")
  .option("--audit", "Run npm audit (default from config)")
  .option("--no-audit", "Skip npm audit")
  .option(
    "--fail-on-build",
    "Exit non-zero if either side's build command exits non-zero"
  )
  .option(
    "--no-fail-on-build",
    "Do not propagate build exit codes from either side"
  )
  .action(async (options: Record<string, unknown>) => {
    const cwd = process.cwd();
    const argv = process.argv;
    try {
      await runCompare({
        cwd,
        argv,
        baseFlag: options.base as string | undefined,
        headFlag: options.head as string | undefined,
        buildCommandFlag: options.buildCommand as string | undefined,
        buildDirFlag: options.buildDir as string | undefined,
        outputFlag: options.output as string | undefined,
        configFlag: options.config as string | undefined,
        audit: auditFromArgv(argv),
        failOnBuild: failOnBuildFromArgv(argv),
      });
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  });

cli
  .command("init", "Create bundlelens.config.json (with examples) and update .gitignore")
  .option("--force", "Overwrite existing bundlelens.config.json")
  .option("--skip-gitignore", "Do not append report dir to .gitignore")
  .option(
    "--output <dir>",
    "Report output directory written in config (default: bundlelens)"
  )
  .action(async (options: Record<string, unknown>) => {
    await runInit({
      cwd: process.cwd(),
      force: Boolean(options.force),
      skipGitignore: Boolean(options.skipGitignore),
      outputDir: options.output as string | undefined,
    });
  });

cli.help();
cli.version(readBundleLensVersion());

const argv = process.argv.slice(2);
if (argv.length === 0) {
  cli.outputHelp();
  process.exitCode = 1;
} else {
  try {
    cli.parse(process.argv);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}
