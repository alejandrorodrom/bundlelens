import process from "node:process";
import { auditFromArgv } from "../utils/cliArgv.js";
import { resolvePathInCwd } from "../utils/pathResolve.js";
import { resolveConfig } from "../utils/config.js";
import { analyzeBuildDir } from "../core/analyzeBuildDir.js";
import { generateReport } from "../core/generateReport.js";
import { createSpinner } from "../utils/spinner.js";
import { printTerminalSummary } from "../utils/terminalSummary.js";
import { printAnalyzerNotices, promptRequiredValue } from "./shared.js";

export type AnalyzeCliOptions = {
  cwd: string;
  argv: string[];
  /** Positional `[buildDir]` from the CLI. */
  buildDirPos?: string;
  buildDirFlag?: string;
  output?: string;
  config?: string;
};

/**
 * Analyzes an existing build directory and writes the HTML report.
 */
export async function runAnalyze(options: AnalyzeCliOptions): Promise<void> {
  const { cwd, argv } = options;
  const fromPos = options.buildDirPos?.trim();
  const fromFlag = options.buildDirFlag?.trim();
  const cliBuildDir = fromPos || fromFlag || undefined;
  const config = await resolveConfig(cwd, {
    buildDir: cliBuildDir,
    outputDir: options.output,
    audit: auditFromArgv(argv),
    configPath: options.config,
  });

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
        "Missing build directory: use analyze <dir>, --build-dir, set buildDir in bundlelens.config.json, or run in an interactive terminal."
      );
      process.exitCode = 1;
      return;
    }
  }

  const outputDirAbs = config.outputDir;

  const spin = createSpinner();
  try {
    spin.start("Analyzing build output…");
    const report = await analyzeBuildDir({
      mode: "analyze",
      buildDirAbs,
      outputDirAbs,
      config,
      build: null,
      npmAuditCwd: cwd,
      onStatus: (msg) => spin.update(msg),
    });
    spin.stop("Build output analysis complete");
    const notices = report.metadata.analysisNotices ?? [];
    printAnalyzerNotices(notices);

    spin.start("Writing report…");
    const { filesPath } = await generateReport(report, outputDirAbs);
    spin.stop("Report written.");

    printTerminalSummary(report);
    console.log(`Report: ${outputDirAbs}/index.html`);
    console.log(`Rankings: ${outputDirAbs}/rankings.html`);
    if (filesPath) {
      console.log(`Files: ${outputDirAbs}/files.html`);
    }
  } catch (e) {
    spin.fail(
      e instanceof Error ? e.message : "Error while analyzing build output"
    );
    process.exitCode = 1;
  }
}
