#!/usr/bin/env node
import process from "node:process";
import { cac } from "cac";
import { resolveConfig } from "../utils/config.js";
import { readBundleLensVersion } from "../utils/version.js";
import { runBuild } from "../core/runBuild.js";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { generateReport } from "../core/generateReport.js";
import { createSpinner } from "../utils/spinner.js";
import { printTerminalSummary } from "../utils/terminalSummary.js";

function auditFromArgv(argv: string[]): boolean | undefined {
  const no = argv.includes("--no-audit");
  const yes = argv.includes("--audit");
  if (no) {
    return false;
  }
  if (yes) {
    return true;
  }
  return undefined;
}

const cli = cac("bundlelens");

cli
  .command("run <buildCommand>", "Run the build command and analyze output")
  .option("--build-dir <dir>", "Build output directory to analyze")
  .option("--output <dir>", "Report output directory (default: ./bundlelens)")
  .option("--config <file>", "Path to bundlelens.config.json")
  .option(
    "--audit",
    "Run npm audit (on by default; use to override audit:false in config)"
  )
  .option("--no-audit", "Skip npm audit for this run")
  .action(async (buildCommand: string, options: Record<string, unknown>) => {
    const cwd = process.cwd();
    const argv = process.argv;
    const config = await resolveConfig(cwd, {
      buildCommand,
      buildDir: options.buildDir as string | undefined,
      outputDir: options.output as string | undefined,
      audit: auditFromArgv(argv),
      configPath: options.config as string | undefined,
    });

    if (!buildCommand || !String(buildCommand).trim()) {
      console.error(
        'Provide a build command, e.g. bundlelens run "npm run build"'
      );
      process.exitCode = 1;
      return;
    }

    const buildDirAbs = config.buildDir;
    if (!buildDirAbs) {
      console.error(
        "Missing build directory: use --build-dir or set buildDir in bundlelens.config.json."
      );
      process.exitCode = 1;
      return;
    }

    const outputDirAbs = config.outputDir;

    const spin = createSpinner();
    spin.start("Running build command…");
    let build;
    try {
      const result = await runBuild(buildCommand, cwd, outputDirAbs);
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

      spin.start("Writing report (HTML + JSON)…");
      await generateReport(report, outputDirAbs);
      spin.stop(`Report written to ${outputDirAbs}`);
      printTerminalSummary(report);
    } catch (e) {
      spin.fail(e instanceof Error ? e.message : "Error while running bundlelens");
      process.exitCode = 1;
      return;
    }

    if (build.exitCode !== 0) {
      process.exitCode = build.exitCode ?? 1;
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

    const buildDirAbs = config.buildDir;
    if (!buildDirAbs) {
      console.error(
        "Missing build directory: bundlelens analyze <dir>, use --build-dir, or set buildDir in bundlelens.config.json."
      );
      process.exitCode = 1;
      return;
    }

    const outputDirAbs = config.outputDir;

    const report = await analyzeBuildDir({
      mode: "analyze",
      buildDirAbs,
      outputDirAbs,
      config,
      build: null,
    });
    const { filesPath } = await generateReport(report, outputDirAbs);
    printTerminalSummary(report);
    console.log(`Report: ${outputDirAbs}/index.html`);
    console.log(`Rankings: ${outputDirAbs}/rankings.html`);
    if (filesPath) {
      console.log(`Files: ${outputDirAbs}/files.html`);
    }
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
