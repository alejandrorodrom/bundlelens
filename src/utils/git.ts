import path from "node:path";
import { execa } from "execa";

export type GitWorktreeHandle = {
  /** Directory where the build should run (repo subfolder when cwd is not the root). */
  cwd: string;
  /** Root of the temporary Git worktree (not the main repository root). */
  root: string;
  remove: () => Promise<void>;
};

function trimLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function getGitRoot(startDir: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
      cwd: startDir,
      stripFinalNewline: true,
    });
    const root = stdout.trim();
    return root ? path.resolve(root) : null;
  } catch {
    return null;
  }
}

/** Short name of the current branch, or null if detached / error. */
export async function getCurrentBranchShort(
  gitRoot: string
): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["symbolic-ref", "-q", "--short", "HEAD"], {
      cwd: gitRoot,
      stripFinalNewline: true,
    });
    const b = stdout.trim();
    return b || null;
  } catch {
    return null;
  }
}

/**
 * Local and remote refs (short names), sorted with exact duplicates removed.
 */
export async function listGitRefsForSearch(gitRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execa(
      "git",
      [
        "for-each-ref",
        "--format=%(refname:short)",
        "refs/heads",
        "refs/remotes",
        "--sort=refname",
      ],
      { cwd: gitRoot, stripFinalNewline: true }
    );
    const lines = trimLines(stdout);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of lines) {
      if (r.endsWith("/HEAD")) continue;
      if (seen.has(r)) continue;
      seen.add(r);
      out.push(r);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Prepares an isolated directory with the contents of `ref` for builds.
 * Uses a detached worktree so the same branch as the main checkout can still be
 * materialized (Git forbids checking out one branch in two linked worktrees).
 */
export async function prepareWorktreeForRef(options: {
  gitRoot: string;
  /** Effective project cwd (e.g. monorepo subfolder). */
  projectCwd: string;
  ref: string;
  tempParentDir: string;
  /** Unique safe folder name under tempParentDir. */
  slotName: string;
}): Promise<GitWorktreeHandle> {
  const { gitRoot, projectCwd, ref, tempParentDir, slotName } = options;
  const rel = path.relative(gitRoot, path.resolve(projectCwd));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Current working directory must be inside the Git repository.");
  }

  const wtRoot = path.join(tempParentDir, slotName);
  await execa(
    "git",
    ["worktree", "add", "--force", "--detach", wtRoot, ref.trim()],
    {
      cwd: gitRoot,
    }
  );

  const inner = path.join(wtRoot, rel);
  return {
    cwd: inner,
    root: wtRoot,
    remove: async () => {
      try {
        await execa("git", ["worktree", "remove", "--force", wtRoot], {
          cwd: gitRoot,
        });
      } catch {
        /* ignore */
      }
    },
  };
}
