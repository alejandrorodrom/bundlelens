import process from "node:process";
import { input } from "@inquirer/prompts";
import { isInteractiveTerminal } from "../utils/tty.js";

/**
 * Prints non-fatal analyzer lines to stderr with a warning prefix.
 *
 * @param notices - Human-readable notice strings (empty/undefined skips output).
 * @param options - Optional heading after the warning icon (default: `Analyzer notices`).
 * @param options.trailingBlankLine - When false, omits the final blank line (matches legacy compare output).
 */
export function printAnalyzerNotices(
  notices: string[] | undefined,
  options?: { headingAfterIcon?: string; trailingBlankLine?: boolean }
): void {
  if (!notices || notices.length === 0) return;
  const heading = options?.headingAfterIcon ?? "Analyzer notices";
  const trailingBlank =
    options?.trailingBlankLine === undefined ? true : options.trailingBlankLine;
  const warningIcon = process.stderr.isTTY ? "\x1b[33m⚠\x1b[0m" : "⚠";
  console.warn("");
  console.warn(`${warningIcon} ${heading}`);
  for (const n of notices) {
    console.warn(`  - ${n}`);
  }
  if (trailingBlank) {
    console.warn("");
  }
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
