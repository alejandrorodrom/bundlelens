import fs from "node:fs/promises";
import path from "node:path";
import { input, select } from "@inquirer/prompts";
import { runShellCommand } from "./shell.js";
import { isInteractiveTerminal } from "./tty.js";

/**
 * @param abs - Absolute filesystem path.
 * @returns Whether `fs.access` succeeds.
 */
async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

/** Nearest `package.json` from `startAbs` up through `ceilingAbs`, else `startAbs`. */
export async function findPackageJsonDir(
  startAbs: string,
  ceilingAbs: string
): Promise<string> {
  const start = path.resolve(startAbs);
  const ceiling = path.resolve(ceilingAbs);
  const rel = path.relative(ceiling, start);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return start;
  }
  let d = start;
  for (;;) {
    if (await pathExists(path.join(d, "package.json"))) {
      return d;
    }
    if (d === ceiling) {
      return start;
    }
    const parent = path.dirname(d);
    if (parent === d) {
      return start;
    }
    const relParent = path.relative(ceiling, parent);
    if (relParent.startsWith("..") || path.isAbsolute(relParent)) {
      return start;
    }
    d = parent;
  }
}

type InstallCandidate = {
  manager: "pnpm" | "yarn" | "bun" | "npm";
  lockfile: string;
  command: string;
};

/**
 * Detects likely install commands from lockfiles under `cwd`.
 *
 * @param cwd - Project root containing `package.json`.
 * @returns Candidate list, or `null` when not a Node project.
 */
async function detectInstallCandidates(cwd: string): Promise<InstallCandidate[] | null> {
  const hasPkg = await pathExists(path.join(cwd, "package.json"));
  if (!hasPkg) return null;

  const j = (...parts: string[]) => path.join(cwd, ...parts);
  const [hasPnpmLock, hasYarnLock, hasBunLockb, hasBunLock, hasNpmLock] =
    await Promise.all([
      pathExists(j("pnpm-lock.yaml")),
      pathExists(j("yarn.lock")),
      pathExists(j("bun.lockb")),
      pathExists(j("bun.lock")),
      pathExists(j("package-lock.json")),
    ]);

  const candidates: InstallCandidate[] = [];

  if (hasPnpmLock) {
    candidates.push({
      manager: "pnpm",
      lockfile: "pnpm-lock.yaml",
      command: "pnpm install --frozen-lockfile",
    });
  }
  if (hasYarnLock) {
    candidates.push({
      manager: "yarn",
      lockfile: "yarn.lock",
      command: "yarn install --immutable",
    });
  }
  if (hasBunLockb) {
    candidates.push({
      manager: "bun",
      lockfile: "bun.lockb",
      command: "bun install --frozen-lockfile",
    });
  } else if (hasBunLock) {
    candidates.push({
      manager: "bun",
      lockfile: "bun.lock",
      command: "bun install --frozen-lockfile",
    });
  }
  if (hasNpmLock) {
    candidates.push({
      manager: "npm",
      lockfile: "package-lock.json",
      command: "npm install",
    });
  }

  return candidates;
}

/**
 * Interactive picker for an install command when none is configured.
 *
 * @param options - Log label and candidate commands.
 * @returns Shell command string to execute.
 */
async function chooseInstallCommand(options: {
  label: string;
  candidates: InstallCandidate[];
}): Promise<string> {
  const { label, candidates } = options;
  if (!isInteractiveTerminal()) {
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

/**
 * If `cwd` has `package.json` but no `node_modules`, runs an install (or prompts for one).
 *
 * @param options.label - Prefix used in logs/errors.
 * @param options.cwd - Project directory to install into.
 * @param options.onStatus - Optional status callback.
 * @param options.preferredCommand - Non-interactive install command when set.
 * @param options.onBeforeInteractivePrompt - Pauses UI (e.g. spinner) before Inquirer.
 * @param options.onAfterInteractivePrompt - Resumes UI after Inquirer.
 * @returns The install command used, or `undefined` when install was skipped.
 */
export async function ensureDependenciesIfNeeded(options: {
  label: string;
  cwd: string;
  onStatus?: (msg: string) => void;
  preferredCommand?: string;
  onBeforeInteractivePrompt?: () => void;
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
