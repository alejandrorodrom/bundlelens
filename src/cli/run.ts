import process from "node:process";
import { auditFromArgv, failOnBuildFromArgv } from "../utils/cliArgv.js";
import { resolvePathInCwd } from "../utils/pathResolve.js";
import { resolveConfig } from "../utils/config.js";
import { runBuild } from "../core/runBuild.js";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { generateReport } from "../core/generateReport.js";
import { createSpinner } from "../utils/spinner.js";
import { ensureDependenciesIfNeeded } from "../utils/dependencies.js";
import { ensureNpmrcPackageLockTrue } from "../utils/npmrcPackageLock.js";
import { printTerminalSummary } from "../utils/terminalSummary.js";
import { printAnalyzerNotices, promptRequiredValue } from "./shared.js";

export type RunCliOptions = {
  cwd: string;
  argv: string[];
  buildCommand?: string;
  buildDir?: string;
  output?: string;
  config?: string;
};

/**
 * Runs the project build, analyzes output, and writes the HTML report.
 */
export async function runRun(options: RunCliOptions): Promise<void> {
  const { cwd, argv } = options;
  const cliCmd = options.buildCommand?.trim();
  const config = await resolveConfig(cwd, {
    buildCommand: cliCmd || undefined,
    buildDir: options.buildDir,
    outputDir: options.output,
    audit: auditFromArgv(argv),
    failOnBuild: failOnBuildFromArgv(argv),
    configPath: options.config,
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
      buildDirAbs = resolvePathInCwd(raw, cwd);
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
    await ensureNpmrcPackageLockTrue(cwd);
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
      npmAuditCwd: cwd,
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
}
