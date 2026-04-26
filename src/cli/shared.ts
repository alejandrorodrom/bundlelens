import process from "node:process";
import { input } from "@inquirer/prompts";
import { isInteractiveTerminal } from "../utils/tty.js";

/**
 * Prints non-fatal analyzer lines to stderr with a warning prefix.
 *
 * @param notices - Human-readable notice strings (empty skips output).
 */
export function printAnalyzerNotices(notices: string[]): void {
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
export async function promptRequiredValue(options: {
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
