import { execaCommand } from "execa";

export type ShellResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  startedAt: string;
  endedAt: string;
};

export async function runShellCommand(
  command: string,
  cwd: string
): Promise<ShellResult> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = await execaCommand(command, {
    cwd,
    reject: false,
  });
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  const exitCode = result.exitCode ?? null;
  const endedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - start);
  return { stdout, stderr, exitCode, durationMs, startedAt, endedAt };
}
