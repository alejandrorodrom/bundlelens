import fs from "node:fs/promises";
import path from "node:path";

/**
 * When `.npmrc` exists under `cwd` and a line sets `package-lock` to `false`, only that
 * assignment is changed to `true`. Other lines and line endings are left intact.
 *
 * If that rewrite runs, `package-lock.json` in the same directory is removed so a later
 * install can regenerate it under `package-lock=true` (ignored if the file is absent).
 *
 * @param cwd - Project directory (e.g. compare worktree with `package.json`).
 */
export async function ensureNpmrcPackageLockTrue(cwd: string): Promise<void> {
  const npmrcPath = path.join(cwd, ".npmrc");
  let raw: string;
  try {
    raw = await fs.readFile(npmrcPath, "utf8");
  } catch {
    return;
  }

  const bom = raw.charCodeAt(0) === 0xfeff ? "\ufeff" : "";
  if (bom) {
    raw = raw.slice(1);
  }

  const replaced = raw.replace(
    /^(\s*package-lock\s*=\s*)false(\s*(?:#.*)?)$/gim,
    "$1true$2"
  );
  if (replaced === raw) {
    return;
  }

  await fs.writeFile(npmrcPath, bom + replaced, "utf8");

  const lockPath = path.join(cwd, "package-lock.json");
  try {
    await fs.unlink(lockPath);
  } catch {
    /* absent or unreadable — skip */
  }
}
