import path from "node:path";

/**
 * @param raw - Absolute or relative path string (trimmed internally).
 * @param cwd - Base for relative resolution.
 * @returns Normalized absolute path.
 */
export function resolvePathInCwd(raw: string, cwd: string): string {
  const trimmed = raw.trim();
  return path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(cwd, trimmed);
}
