import fs from "node:fs/promises";
import type { BundleLensReport } from "../types/report.js";
import { writeJsonReport } from "../reporters/jsonReporter.js";
import { writeHtmlReport } from "../reporters/htmlReporter.js";

/**
 * Writes JSON + HTML report assets for a completed `BundleLensReport`.
 *
 * @param report - Analysis output to serialize.
 * @param outputDirAbs - Destination folder for HTML/JSON/logs.
 * @returns Paths to generated primary artifacts.
 */
export async function generateReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<{
  jsonPath: string;
  indexPath: string;
  filesPath: string | null;
  treemapPath: string | null;
  rankingsPath: string;
}> {
  await fs.mkdir(outputDirAbs, { recursive: true });
  const jsonPath = await writeJsonReport(report, outputDirAbs);
  const { indexPath, filesPath, treemapPath, rankingsPath } =
    await writeHtmlReport(report, outputDirAbs);
  return { jsonPath, indexPath, filesPath, treemapPath, rankingsPath };
}
