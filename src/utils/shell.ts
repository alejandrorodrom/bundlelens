import { execa, parseCommandString } from "execa";

/** Result of running a shell command via `execa`. */
export type ShellResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  startedAt: string;
  endedAt: string;
};

/**
 * Runs `command` in `cwd` without throwing on non-zero exit (inspect `exitCode`).
 *
 * @param command - Full shell command string.
 * @param cwd - Working directory for the subprocess.
 * @returns Captured streams, timing, and exit metadata.
 */
export async function runShellCommand(
  command: string,
  cwd: string
): Promise<ShellResult> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = await execa({ cwd, reject: false })`${parseCommandString(command)}`;
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  const exitCode = result.exitCode ?? null;
  const endedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - start);
  return { stdout, stderr, exitCode, durationMs, startedAt, endedAt };
}
