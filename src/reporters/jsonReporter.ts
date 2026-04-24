import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensReport } from "../types/report.js";

export async function writeJsonReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<string> {
  const target = path.join(outputDirAbs, "report.json");
  await fs.writeFile(target, JSON.stringify(report, null, 2), "utf8");
  return target;
}
