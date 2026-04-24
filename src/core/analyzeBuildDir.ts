import fs from "node:fs/promises";
import type { ResolvedConfig } from "../types/config.js";
import type { BundleLensReport, FileEntry } from "../types/report.js";
import { collectFiles } from "../collectors/fileCollector.js";
import { collectNpmAudit } from "../collectors/auditCollector.js";
import { buildSummary } from "../analyzers/sizeAnalyzer.js";
import { buildDistributions } from "../analyzers/distributionAnalyzer.js";
import { buildPercentiles } from "../analyzers/percentileAnalyzer.js";
import { evaluateThresholds } from "../analyzers/thresholdAnalyzer.js";
import { buildRankings } from "./rankings.js";
import { readBundleLensVersion } from "../utils/version.js";

export type AnalyzeOptions = {
  mode: "run" | "analyze";
  buildDirAbs: string;
  outputDirAbs: string;
  config: ResolvedConfig;
  build: BundleLensReport["build"];
  /** Status text for UI (e.g. spinner in `bundlelens run`). */
  onStatus?: (message: string) => void;
};

export async function analyzeBuildDir(
  options: AnalyzeOptions
): Promise<BundleLensReport> {
  const { mode, buildDirAbs, outputDirAbs, config, build, onStatus } =
    options;

  let files: FileEntry[] = [];
  onStatus?.("Checking build output directory…");
  try {
    await fs.access(buildDirAbs);
    onStatus?.("Indexing files and measuring gzip/brotli…");
    files = await collectFiles(buildDirAbs, config.compression);
  } catch {
    files = [];
  }
  onStatus?.("Computing summaries, rankings, and percentiles…");
  const summary = buildSummary(files);
  const rankings = buildRankings(files);
  const distributions = buildDistributions(files);
  const percentiles = buildPercentiles(files);
  onStatus?.("Evaluating thresholds…");
  const thresholds = evaluateThresholds(
    config.thresholds,
    files,
    summary
  );

  let audit: BundleLensReport["audit"] = null;
  if (config.audit) {
    onStatus?.("Running npm audit (may take a moment)…");
    audit = await collectNpmAudit(process.cwd());
  }

  const report: BundleLensReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      bundlelensVersion: readBundleLensVersion(),
      mode,
      buildDir: buildDirAbs,
      outputDir: outputDirAbs,
    },
    build,
    files,
    summary,
    rankings,
    distributions,
    percentiles,
    audit,
    thresholds,
  };

  return report;
}
