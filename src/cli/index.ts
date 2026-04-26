#!/usr/bin/env node
/**
 * CLI entrypoint for the `bundlelens` command (`run`, `analyze`, `compare`, `init`).
 */
import process from "node:process";
import { cac } from "cac";
import { auditFromArgv, failOnBuildFromArgv } from "../utils/cliArgv.js";
import { readBundleLensVersion } from "../utils/version.js";
import { runAnalyze } from "./analyze.js";
import { runCompare } from "./compare.js";
import { runInit } from "./init.js";
import { runRun } from "./run.js";

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
    const argv = process.argv;
    await runRun({
      cwd: process.cwd(),
      argv,
      buildCommand: buildCommand?.trim(),
      buildDir: options.buildDir as string | undefined,
      output: options.output as string | undefined,
      config: options.config as string | undefined,
    });
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
    const argv = process.argv;
    await runAnalyze({
      cwd: process.cwd(),
      argv,
      buildDirPos: buildDir,
      buildDirFlag: options.buildDir as string | undefined,
      output: options.output as string | undefined,
      config: options.config as string | undefined,
    });
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
    "Build command override (merged after config file on each side, like bundlelens run)"
  )
  .option(
    "--build-dir <dir>",
    "Build output directory override (merged after config file on each side, like bundlelens run)"
  )
  .option(
    "--install-command <cmd>",
    "Dependency install when node_modules is missing (after install in config; before interactive prompt)"
  )
  .option(
    "--output <dir>",
    "Report root override (merged after outputDir in config; compare.html under <resolved>/compare/)"
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
        installCommandFlag: options.installCommand as string | undefined,
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
