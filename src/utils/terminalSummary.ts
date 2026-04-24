import type { BundleLensReport } from "../types/report.js";
import { formatBytes } from "./bytes.js";
import { formatDurationHuman } from "./formatDurationHuman.js";

function fmtRatioPct(r: number | null | undefined): string {
  if (r == null || Number.isNaN(r)) {
    return "—";
  }
  return `${(r * 100).toFixed(1)}%`;
}

/** Ancho de la columna de etiqueta (sin los 4 espacios de sangría). */
const INSIGHTS_LABEL_COL = 32;

function appendInsightsSummary(lines: string[], report: BundleLensReport): void {
  const ins = report.insights;
  if (!ins) {
    return;
  }
  const row = (label: string, value: string): void => {
    lines.push(`    ${label.padEnd(INSIGHTS_LABEL_COL)}${value}`);
  };
  const sm = ins.sourceMaps;
  const conc = ins.concentration;
  lines.push("");
  lines.push("  Insights");
  row(
    "Source maps (count / raw)",
    `${sm.sourceMapFileCount} / ${formatBytes(sm.sourceMapRawBytes)}`
  );
  row(
    "JS/CSS deliverables",
    `${sm.deliverableJsCssFileCount} files, ${formatBytes(sm.deliverableJsCssRawBytes)} raw`
  );
  row("Maps % of total raw", `${sm.percentOfTotalRawBytesInSourceMaps.toFixed(2)}%`);
  if (conc.largestFilePath) {
    row(
      "Largest file",
      `${conc.largestFilePath} (${formatBytes(conc.largestFileRawBytes)}, ${conc.largestFilePercentOfTotalRaw.toFixed(1)}% of raw)`
    );
  }
  const cr = ins.compressionRatios;
  if (cr.javascript) {
    row(
      "JS gzip ratio (median/mean)",
      `${fmtRatioPct(cr.javascript.medianGzipOverRaw)} / ${fmtRatioPct(cr.javascript.meanGzipOverRaw)}`
    );
  }
  if (cr.css) {
    row(
      "CSS gzip ratio (median/mean)",
      `${fmtRatioPct(cr.css.medianGzipOverRaw)} / ${fmtRatioPct(cr.css.meanGzipOverRaw)}`
    );
  }
  const ef = ins.emptyFiles;
  if (ef.count > 0) {
    row(`Tiny files (≤${ef.thresholdBytes} B)`, String(ef.count));
  }
  if (ins.topLevelFolders.length > 0) {
    const top = ins.topLevelFolders[0];
    row(
      "Largest top-level folder",
      `${top.folder} (${formatBytes(top.totalRawBytes)}, ${top.percentOfTotalRawBytes.toFixed(1)}% of raw)`
    );
  }
  if (ins.productionMaps.triggered) {
    row("Note", ins.productionMaps.reason);
  }
  const nh = ins.nameHash;
  row(
    "Hashed / plain artifact names",
    `${nh.withContentHashCount} / ${nh.withoutContentHashCount}`
  );
  if (nh.duplicateBasenameFileCount > 0) {
    row("Duplicate basenames", `${nh.duplicateBasenameFileCount} file(s)`);
  }
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function modeLabel(mode: string): string {
  if (mode === "run") {
    return "Build + analysis";
  }
  if (mode === "analyze") {
    return "Directory analysis only";
  }
  return mode;
}

function pctVsRaw(compressed: number, raw: number): string | null {
  if (raw <= 0 || compressed <= 0 || compressed >= raw) {
    return null;
  }
  return `≈ ${Math.round((1 - compressed / raw) * 100)}% smaller than raw`;
}

const SEVERITY_ORDER = [
  "critical",
  "high",
  "moderate",
  "low",
  "info",
  "unknown",
];

function severityLabel(key: string): string {
  const k = key.toLowerCase();
  const map: Record<string, string> = {
    critical: "Critical",
    high: "High",
    moderate: "Moderate",
    low: "Low",
    info: "Info",
    unknown: "Unknown",
  };
  return map[k] ?? key;
}

function sortedSeverityKeys(bySeverity: Record<string, number>): string[] {
  const keys = Object.keys(bySeverity).filter((k) => (bySeverity[k] ?? 0) > 0);
  keys.sort((a, b) => {
    const ia = SEVERITY_ORDER.indexOf(a.toLowerCase());
    const ib = SEVERITY_ORDER.indexOf(b.toLowerCase());
    const va = ia === -1 ? 999 : ia;
    const vb = ib === -1 ? 999 : ib;
    if (va !== vb) {
      return va - vb;
    }
    return a.localeCompare(b);
  });
  return keys;
}

function appendAuditSummary(lines: string[], report: BundleLensReport): void {
  const a = report.audit;
  if (!a) {
    return;
  }
  lines.push("");
  lines.push("  Vulnerabilities");
  if (a.status === "requires_internet") {
    lines.push(`    ${a.message ?? "Internet access is required."}`);
    return;
  }
  if (a.status === "error") {
    lines.push(`    ${a.message ?? "The vulnerability analysis could not be completed."}`);
    return;
  }
  if (a.status === "clean") {
    lines.push("    None found.");
    lines.push("    By severity        —");
    return;
  }
  const directness = a.byDirectness ?? {
    direct: 0,
    transitive: 0,
    unknown: 0,
  };
  const totalVulns = a.total ?? a.vulnerabilities?.length ?? 0;
  const labelCol = 26;
  const row = (label: string, value: number | string): void => {
    lines.push(`    ${label.padEnd(labelCol)}${value}`);
  };
  row("Total reported", totalVulns);
  row("Direct dependencies", directness.direct);
  row("Transitive", directness.transitive);
  if (directness.unknown > 0) {
    row("Unclassified", directness.unknown);
  }
  const keys = sortedSeverityKeys(a.bySeverity || {});
  if (keys.length) {
    lines.push("    By severity:");
    for (const k of keys) {
      lines.push(`      ${severityLabel(k)}: ${String(a.bySeverity[k])}`);
    }
  } else {
    lines.push("    By severity        (no breakdown in metadata)");
  }
}

function thresholdsLine(report: BundleLensReport): string | null {
  const t = report.thresholds;
  if (!t?.length) {
    return null;
  }
  const exceeded = t.filter((x) => x.exceeded).length;
  return `Thresholds: ${exceeded} exceeded of ${t.length}.`;
}

/**
 * Prints a stdout summary aligned with the HTML "Overview" section.
 * Paths are listed last since they are secondary for a quick read.
 */
export function printTerminalSummary(report: BundleLensReport): void {
  const m = report.metadata;
  const sum = report.summary;
  const raw = sum.totalRawBytes;
  const gz = sum.totalGzipBytes;
  const br = sum.totalBrotliBytes;
  const gzPct = pctVsRaw(gz, raw);
  const brPct = pctVsRaw(br, raw);

  const lines: string[] = [
    "",
    "────────────────────────────────────────────────────────────",
    "  Summary",
    "────────────────────────────────────────────────────────────",
    `  Indexed files          ${sum.totalFiles}`,
    `  Raw size               ${formatBytes(raw)}`,
    `  Estimated gzip         ${formatBytes(gz)}${gzPct ? `  (${gzPct})` : ""}`,
    `  Estimated brotli       ${formatBytes(br)}${brPct ? `  (${brPct})` : ""}`,
    "",
    "  Context",
    `    Generated            ${formatGeneratedAt(m.generatedAt)}`,
    `    BundleLens           ${m.bundlelensVersion}`,
    `    Mode                 ${modeLabel(m.mode)}`,
  ];

  if (typeof m.analysisDurationMs === "number") {
    lines.push(
      `    Analysis time        ${formatDurationHuman(m.analysisDurationMs)}`
    );
  }

  appendInsightsSummary(lines, report);

  appendAuditSummary(lines, report);

  const th = thresholdsLine(report);
  if (th) {
    lines.push(`  ${th}`);
  }

  if (report.build) {
    const b = report.build;
    const code =
      b.exitCode === null || b.exitCode === undefined ? "n/a" : String(b.exitCode);
    lines.push("");
    lines.push("  Build");
    lines.push(`    Exit code            ${code}`);
    lines.push(
      `    Duration             ${formatDurationHuman(b.durationMs ?? 0)}`
    );
  }

  lines.push("");
  lines.push("  Paths");
  lines.push(`    Analyzed build dir   ${m.buildDir}`);
  lines.push(`    Report output dir    ${m.outputDir}`);

  lines.push("────────────────────────────────────────────────────────────");
  lines.push("");

  process.stdout.write(lines.join("\n"));
}
