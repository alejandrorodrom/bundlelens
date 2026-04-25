import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { input, select } from "@inquirer/prompts";
import { runShellCommand } from "./shell.js";

async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

type InstallCandidate = {
  manager: "pnpm" | "yarn" | "bun" | "npm";
  lockfile: string;
  command: string;
};

async function detectInstallCandidates(cwd: string): Promise<InstallCandidate[] | null> {
  const hasPkg = await pathExists(path.join(cwd, "package.json"));
  if (!hasPkg) return null;

  const candidates: InstallCandidate[] = [];

  if (await pathExists(path.join(cwd, "pnpm-lock.yaml"))) {
    candidates.push({
      manager: "pnpm",
      lockfile: "pnpm-lock.yaml",
      command: "pnpm install --frozen-lockfile",
    });
  }
  if (await pathExists(path.join(cwd, "yarn.lock"))) {
    candidates.push({
      manager: "yarn",
      lockfile: "yarn.lock",
      command: "yarn install --immutable",
    });
  }
  if (await pathExists(path.join(cwd, "bun.lockb"))) {
    candidates.push({
      manager: "bun",
      lockfile: "bun.lockb",
      command: "bun install --frozen-lockfile",
    });
  } else if (await pathExists(path.join(cwd, "bun.lock"))) {
    candidates.push({
      manager: "bun",
      lockfile: "bun.lock",
      command: "bun install --frozen-lockfile",
    });
  }
  if (await pathExists(path.join(cwd, "package-lock.json"))) {
    candidates.push({
      manager: "npm",
      lockfile: "package-lock.json",
      command: "npm ci",
    });
  }

  return candidates;
}

async function chooseInstallCommand(options: {
  label: string;
  candidates: InstallCandidate[];
}): Promise<string> {
  const { label, candidates } = options;
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!tty) {
    throw new Error(
      `${label}: missing node_modules and interactive install command selection is required. Run in an interactive terminal or install dependencies manually first.`
    );
  }

  const choices = candidates.map((c) => ({
    value: c.command,
    name: `${c.manager} (${c.lockfile}) -> ${c.command}`,
  }));
  choices.push({ value: "__npm_install__", name: "npm (no lockfile fallback) -> npm install" });
  choices.push({ value: "__custom__", name: "Custom command..." });

  const picked = await select({
    message: `${label}: choose dependency install command`,
    choices,
  });
  const selected = String(picked);
  if (selected === "__npm_install__") return "npm install";
  if (selected === "__custom__") {
    return (
      await input({
        message: `${label}: enter custom install command`,
        validate: (v) => (v.trim().length > 0 ? true : "Install command is required."),
      })
    ).trim();
  }
  return selected;
}

export async function ensureDependenciesIfNeeded(options: {
  label: string;
  cwd: string;
  onStatus?: (msg: string) => void;
  preferredCommand?: string;
  /** Called immediately before an interactive install command picker (Inquirer). */
  onBeforeInteractivePrompt?: () => void;
  /** Called after the picker returns (or throws), before `npm install` runs. */
  onAfterInteractivePrompt?: () => void;
}): Promise<string | undefined> {
  const {
    label,
    cwd,
    onStatus,
    preferredCommand,
    onBeforeInteractivePrompt,
    onAfterInteractivePrompt,
  } = options;
  const hasNodeModules = await pathExists(path.join(cwd, "node_modules"));
  if (hasNodeModules) return undefined;

  const candidates = await detectInstallCandidates(cwd);
  if (!candidates) return undefined;
  let installCmd: string;
  if (preferredCommand?.trim()) {
    installCmd = preferredCommand.trim();
  } else {
    onBeforeInteractivePrompt?.();
    try {
      installCmd = await chooseInstallCommand({ label, candidates });
    } finally {
      onAfterInteractivePrompt?.();
    }
  }

  onStatus?.(`${label}: installing dependencies…`);
  const res = await runShellCommand(installCmd, cwd);
  if (res.exitCode !== 0) {
    const details = (res.stderr || res.stdout || "").trim();
    throw new Error(
      `${label}: dependency install failed (${installCmd}) with exit code ${res.exitCode}.${details ? `\n${details}` : ""}`
    );
  }
  return installCmd;
}
