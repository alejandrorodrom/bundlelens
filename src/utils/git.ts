import path from "node:path";
import { execa } from "execa";

/** Handle for a detached Git worktree created for an isolated checkout. */
export type GitWorktreeHandle = {
  /** Effective project directory (e.g. monorepo subfolder inside the worktree). */
  cwd: string;
  /** Worktree root directory (where Git placed the checkout). */
  root: string;
  /** Best-effort removal of the worktree via `git worktree remove`. */
  remove: () => Promise<void>;
};

/**
 * @param s - Multi-line command output.
 * @returns Non-empty trimmed lines.
 */
function trimLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Returns the Git repository root for `startDir`, or `null` if not inside a repo.
 *
 * @param startDir - Any directory under the repository.
 * @returns Absolute repo root, or `null` on failure.
 */
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

/**
 * Local and remote ref short names for branch pickers (deduplicated, sorted).
 *
 * @param gitRoot - Repository root path.
 * @returns Ref short names (empty array on Git error).
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
 * Adds a detached worktree for `ref` under `tempParentDir`/`slotName` and returns paths for builds.
 *
 * @param options.gitRoot - Repository root path.
 * @param options.projectCwd - Current project directory (must be under `gitRoot`).
 * @param options.ref - Git ref to materialize (branch, tag, or SHA).
 * @param options.tempParentDir - Folder receiving the worktree directory.
 * @param options.slotName - Subfolder name under `tempParentDir` for this checkout.
 * @returns Worktree cwd (project-relative) plus cleanup handle.
 * @throws When `projectCwd` lies outside `gitRoot`.
 */
export async function prepareWorktreeForRef(options: {
  gitRoot: string;
  projectCwd: string;
  ref: string;
  tempParentDir: string;
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
      } catch {}
    },
  };
}
