import type { FileCategory, ResolvedThresholds } from "../types/config.js";
import type { FileEntry, Summary, ThresholdResult } from "../types/report.js";

type MetricKey =
  | "maxFileRawBytes"
  | "maxFileGzipBytes"
  | "maxTotalRawBytes"
  | "maxTotalGzipBytes";

function checkFileMetrics(
  category: FileCategory,
  files: FileEntry[],
  cfg: Record<string, number | undefined>
): ThresholdResult[] {
  const results: ThresholdResult[] = [];
  const maxFileRaw = cfg.maxFileRawBytes;
  const maxFileGzip = cfg.maxFileGzipBytes;
  const catFiles = files.filter((f) => f.type === category);

  if (maxFileRaw !== undefined) {
    for (const f of catFiles) {
      results.push({
        category,
        metric: "maxFileRawBytes",
        configuredValue: maxFileRaw,
        actualValue: f.rawBytes,
        file: f.path,
        exceeded: f.rawBytes > maxFileRaw,
      });
    }
  }

  if (maxFileGzip !== undefined) {
    for (const f of catFiles) {
      const g = f.gzipBytes ?? 0;
      results.push({
        category,
        metric: "maxFileGzipBytes",
        configuredValue: maxFileGzip,
        actualValue: g,
        file: f.path,
        exceeded: g > maxFileGzip,
      });
    }
  }

  return results;
}

function checkTotals(
  category: FileCategory,
  files: FileEntry[],
  cfg: Record<string, number | undefined>
): ThresholdResult[] {
  const results: ThresholdResult[] = [];
  const maxTotalRaw = cfg.maxTotalRawBytes;
  const maxTotalGzip = cfg.maxTotalGzipBytes;
  const catFiles = files.filter((f) => f.type === category);
  const totalRaw = catFiles.reduce((s, f) => s + f.rawBytes, 0);
  const totalGzip = catFiles.reduce(
    (s, f) => s + (f.gzipBytes ?? 0),
    0
  );

  if (maxTotalRaw !== undefined) {
    results.push({
      category,
      metric: "maxTotalRawBytes",
      configuredValue: maxTotalRaw,
      actualValue: totalRaw,
      file: undefined,
      exceeded: totalRaw > maxTotalRaw,
    });
  }
  if (maxTotalGzip !== undefined) {
    results.push({
      category,
      metric: "maxTotalGzipBytes",
      configuredValue: maxTotalGzip,
      actualValue: totalGzip,
      file: undefined,
      exceeded: totalGzip > maxTotalGzip,
    });
  }
  return results;
}

export function evaluateThresholds(
  thresholds: ResolvedThresholds,
  files: FileEntry[],
  _summary: Summary
): ThresholdResult[] | null {
  if (!thresholds.enabled) return null;

  const all: ThresholdResult[] = [];
  for (const [cat, cfg] of Object.entries(thresholds.categories)) {
    if (!cfg) continue;
    const category = cat as FileCategory;
    const c = cfg as Record<MetricKey, number | undefined>;
    all.push(...checkFileMetrics(category, files, c));
    all.push(...checkTotals(category, files, c));
  }
  return all.length ? all : [];
}
