import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensReport } from "../types/report.js";

/**
 * Writes `report.json` (pretty-printed) next to HTML assets.
 *
 * @param report - Full `BundleLensReport` object.
 * @param outputDirAbs - Report output root.
 * @returns Absolute path to `report.json`.
 */
export async function writeJsonReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<string> {
  const target = path.join(outputDirAbs, "report.json");
  await fs.writeFile(target, JSON.stringify(report, null, 2), "utf8");
  return target;
}
