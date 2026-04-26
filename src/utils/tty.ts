import process from "node:process";

/**
 * Whether stdin/stdout are TTYs (suitable for Inquirer prompts).
 *
 * @returns True when both streams are TTYs.
 */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
