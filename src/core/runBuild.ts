import fs from "node:fs/promises";
import path from "node:path";
import type { BuildExecution } from "../types/report.js";
import { runShellCommand } from "../utils/shell.js";

/** Build metadata plus paths to captured stdout/stderr logs. */
export type RunBuildResult = {
  build: BuildExecution;
  stdoutLogPath: string;
  stderrLogPath: string;
};

/**
 * Runs the build shell command and persists stdout/stderr under `outputDirAbs/logs`.
 *
 * @param command - Shell command line (passed to the system shell).
 * @param cwd - Working directory for the child process.
 * @param outputDirAbs - Report root where `logs/build.*.log` files are written.
 * @returns Build metadata and log file paths.
 */
export async function runBuild(
  command: string,
  cwd: string,
  outputDirAbs: string
): Promise<RunBuildResult> {
  const logsDir = path.join(outputDirAbs, "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const stdoutLogPath = path.join(logsDir, "build.stdout.log");
  const stderrLogPath = path.join(logsDir, "build.stderr.log");

  const result = await runShellCommand(command, cwd);

  await fs.writeFile(stdoutLogPath, result.stdout, "utf8");
  await fs.writeFile(stderrLogPath, result.stderr, "utf8");

  const build: BuildExecution = {
    command,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    cwd,
  };

  return { build, stdoutLogPath, stderrLogPath };
}
