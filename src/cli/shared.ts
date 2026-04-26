import process from "node:process";
import { input } from "@inquirer/prompts";
import { isInteractiveTerminal } from "../utils/tty.js";

/** Prints analyzer notices to stderr (optional heading and trailing newline). */
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
 * Inquirer prompt for a non-empty trimmed string. Throws if not interactive or on empty input;
 * `nonInteractiveErrorMessage` overrides the thrown message when there is no TTY.
 */
export async function promptRequiredValue(options: {
  message: string;
  validateMessage: string;
  nonInteractiveErrorMessage?: string;
  onBeforePrompt?: () => void;
  onAfterPrompt?: () => void;
}): Promise<string> {
  const nonInteractive =
    options.nonInteractiveErrorMessage ?? options.validateMessage;
  if (!isInteractiveTerminal()) {
    throw new Error(nonInteractive);
  }
  options.onBeforePrompt?.();
  try {
    return (
      await input({
        message: options.message,
        validate: (v) => (v.trim().length > 0 ? true : options.validateMessage),
      })
    ).trim();
  } finally {
    options.onAfterPrompt?.();
  }
}
