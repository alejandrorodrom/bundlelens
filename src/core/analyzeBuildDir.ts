import fs from "node:fs/promises";
import process from "node:process";
import type { ResolvedConfig } from "../types/config.js";
import type { BundleLensReport, FileEntry } from "../types/report.js";
import {
  collectFiles,
  type CollectFilesDiagnostics,
  type CollectFilesProgress,
} from "../collectors/fileCollector.js";
import { collectNpmAudit } from "../collectors/auditCollector.js";
import { buildSummary } from "../analyzers/sizeAnalyzer.js";
import { buildDistributions } from "../analyzers/distributionAnalyzer.js";
import { buildPercentiles } from "../analyzers/percentileAnalyzer.js";
import { evaluateThresholds } from "../analyzers/thresholdAnalyzer.js";
import { buildRankings } from "./rankings.js";
import { readBundleLensVersion } from "../utils/version.js";
import { buildInsights } from "../analyzers/insightsAnalyzer.js";
import { findPackageJsonDir } from "../utils/dependencies.js";
import { nodeErrnoCode } from "../utils/nodeErrno.js";

/**
 * Options for {@link analyzeBuildDir}. When `config.audit` is true, `npm audit` runs under
 * `npmAuditCwd` (or `process.cwd()`); with `npmAuditCeiling`, the cwd is resolved upward
 * to the nearest `package.json` up to that directory (Git worktrees).
 */
export type AnalyzeOptions = {
  mode: "run" | "analyze";
  buildDirAbs: string;
  outputDirAbs: string;
  config: ResolvedConfig;
  build: BundleLensReport["build"];
  onStatus?: (message: string) => void;
  npmAuditCwd?: string;
  npmAuditCeiling?: string;
};

/**
 * @param code - Filesystem errno (e.g. `ENOENT`).
 * @returns Short user-facing hint, or empty string when unknown.
 */
function hintForBuildDirErrno(code: string): string {
  switch (code) {
    case "ENOENT":
      return "Directory does not exist or `buildDir` is misspelled; confirm the real build output path.";
    case "EACCES":
    case "EPERM":
      return "Permission denied: check owner/chmod. On macOS: System Settings → Privacy & Security → Full Disk Access for your terminal app (e.g. Cursor or Terminal).";
    case "ENOTDIR":
      return "A path segment is not a directory.";
    case "ELOOP":
      return "Too many symbolic links in the path.";
    default:
      return "";
  }
}

/**
 * Maps file collection progress events to short human-readable status lines.
 *
 * @param onStatus - Optional callback; when omitted returns `undefined`.
 * @returns Progress handler for `collectFiles`, or `undefined`.
 */
function attachCollectFilesProgress(
  onStatus: ((message: string) => void) | undefined
): ((p: CollectFilesProgress) => void) | undefined {
  if (!onStatus) return undefined;

  let indexLastPct = -1;
  let compressLastPct = -1;

  const pctFromProgress = (current: number, total: number): number =>
    Math.min(100, Math.round((current / total) * 100));

  const notifyProgress = (
    label: string,
    current: number,
    total: number,
    lastPct: number
  ): number => {
    if (total <= 0) return lastPct;
    const pct = pctFromProgress(current, total);
    const done = current >= total;
    if (!done && pct === lastPct) return lastPct;
    onStatus(`${label} ${pct}% (${current}/${total})`);
    return pct;
  };

  return (p: CollectFilesProgress) => {
    switch (p.phase) {
      case "discover": {
        if (p.stage === "listing") {
          onStatus("Listing build output files…");
        } else {
          const n = p.pathCount;
          onStatus(
            n === 0
              ? "Found 0 files in build output."
              : n === 1
                ? "Found 1 file in build output."
                : `Found ${n} files in build output.`
          );
        }
        indexLastPct = -1;
        compressLastPct = -1;
        return;
      }
      case "index":
        indexLastPct = notifyProgress(
          "Indexing files…",
          p.current,
          p.total,
          indexLastPct
        );
        return;
      case "compress":
        compressLastPct = notifyProgress(
          "Measuring gzip/brotli…",
          p.current,
          p.total,
          compressLastPct
        );
        return;
    }
  };
}

/**
 * Indexes `buildDirAbs`, runs optional npm audit, and builds summaries/rankings/insights.
 *
 * @param options - Paths, resolved config, optional build record, and status hook.
 * @returns Complete `BundleLensReport` (files may be empty on access errors).
 */
export async function analyzeBuildDir(
  options: AnalyzeOptions
): Promise<BundleLensReport> {
  const { mode, buildDirAbs, outputDirAbs, config, build, onStatus } =
    options;
  const npmAuditBase = options.npmAuditCwd ?? process.cwd();
  const npmAuditDir =
    options.npmAuditCeiling != null
      ? await findPackageJsonDir(npmAuditBase, options.npmAuditCeiling)
      : npmAuditBase;

  const analysisStartedAt = Date.now();

  let files: FileEntry[] = [];
  let diagnostics: CollectFilesDiagnostics = {
    discoveredFiles: 0,
    indexedFiles: 0,
    skippedReadFiles: 0,
    compressionReadErrors: 0,
    skippedReadSamples: [],
    compressionReadSamples: [],
  };
  const analysisNotices: string[] = [];
  onStatus?.("Checking build output directory…");
  try {
    await fs.access(buildDirAbs);
    const result = await collectFiles(
      buildDirAbs,
      config.compression,
      attachCollectFilesProgress(onStatus)
    );
    files = result.entries;
    diagnostics = result.diagnostics;
    const hasReadIssues =
      diagnostics.skippedReadFiles > 0 || diagnostics.compressionReadErrors > 0;
    if (hasReadIssues) {
      analysisNotices.push(
        `Scan stats: discovered=${diagnostics.discoveredFiles}, indexed=${diagnostics.indexedFiles}, skippedRead=${diagnostics.skippedReadFiles}, compressionReReadErrors=${diagnostics.compressionReadErrors}`
      );
    }

    if (diagnostics.skippedReadFiles > 0) {
      analysisNotices.push(
        `${diagnostics.skippedReadFiles} file(s) skipped during indexing due to read/access errors.`
      );
      if (diagnostics.skippedReadSamples.length > 0) {
        const parts = diagnostics.skippedReadSamples
          .map((s) => `${s.path} [${s.code}]`)
          .join("; ");
        analysisNotices.push(`Read error sample (max 5): ${parts}`);
      }
      const perm = diagnostics.skippedReadSamples.some(
        (s) => s.code === "EACCES" || s.code === "EPERM"
      );
      if (perm) {
        analysisNotices.push(
          "Some reads failed with EACCES/EPERM: check file permissions or Full Disk Access for your terminal app on macOS."
        );
      }
    }
    if (diagnostics.compressionReadErrors > 0) {
      analysisNotices.push(
        `${diagnostics.compressionReadErrors} file(s) could not be re-read for gzip/brotli (raw sizes from indexing are still available).`
      );
      if (diagnostics.compressionReadSamples.length > 0) {
        const parts = diagnostics.compressionReadSamples
          .map((s) => `${s.path} [${s.code}]`)
          .join("; ");
        analysisNotices.push(`Compression re-read error sample (max 5): ${parts}`);
      }
    }

    if (files.length === 0) {
      analysisNotices.push(
        `No files indexed under: ${buildDirAbs} (empty directory or all reads failed).`
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = nodeErrnoCode(e) ?? "";
    const hint = hintForBuildDirErrno(code);
    const warnMsg = `Could not access build directory "${buildDirAbs}": ${msg}${hint ? ` — ${hint}` : ""}`;
    analysisNotices.push(warnMsg);
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

  const insights = buildInsights(files, summary);

  let audit: BundleLensReport["audit"] = null;
  if (config.audit) {
    onStatus?.("Running npm audit (may take a moment)…");
    audit = await collectNpmAudit(npmAuditDir);
  }

  const analysisDurationMs = Date.now() - analysisStartedAt;

  const report: BundleLensReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      bundlelensVersion: readBundleLensVersion(),
      mode,
      buildDir: buildDirAbs,
      outputDir: outputDirAbs,
      analysisDurationMs,
      analysisNotices: analysisNotices.length > 0 ? analysisNotices : undefined,
    },
    build,
    files,
    summary,
    rankings,
    distributions,
    percentiles,
    audit,
    thresholds,
    insights,
  };

  return report;
}
