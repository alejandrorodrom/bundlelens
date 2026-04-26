import fs from "node:fs/promises";

/**
 * @param abs - Absolute filesystem path.
 * @returns Whether `fs.access` succeeds.
 */
export async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}
