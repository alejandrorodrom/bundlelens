import fs from "node:fs/promises";
import type { BundleLensReport } from "../types/report.js";
import { writeJsonReport } from "../reporters/jsonReporter.js";
import { writeHtmlReport } from "../reporters/htmlReporter.js";

export async function generateReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<{
  jsonPath: string;
  indexPath: string;
  filesPath: string | null;
  rankingsPath: string;
}> {
  await fs.mkdir(outputDirAbs, { recursive: true });
  const jsonPath = await writeJsonReport(report, outputDirAbs);
  const { indexPath, filesPath, rankingsPath } = await writeHtmlReport(
    report,
    outputDirAbs
  );
  return { jsonPath, indexPath, filesPath, rankingsPath };
}
