import fs from "node:fs/promises";
import path from "node:path";
import type { BuildExecution } from "../types/report.js";
import { runShellCommand } from "../utils/shell.js";

export type RunBuildResult = {
  build: BuildExecution;
  stdoutLogPath: string;
  stderrLogPath: string;
};

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
