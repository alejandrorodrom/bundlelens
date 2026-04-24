import type { BundleLensReport } from "../types/report.js";
import { formatBytes } from "./bytes.js";

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
  const d = a.byDirectness;
  lines.push(
    `    Total                ${a.total ?? a.vulnerabilities.length}  ·  direct ${d.direct}  ·  transitive ${d.transitive}${
      d.unknown > 0 ? `  ·  unclassified ${d.unknown}` : ""
    }`
  );
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
    lines.push("  Build (this run)");
    lines.push(`    Exit code            ${code}`);
    lines.push(`    Duration             ${b.durationMs} ms`);
  }

  lines.push("");
  lines.push("  Paths");
  lines.push(`    Analyzed build dir   ${m.buildDir}`);
  lines.push(`    Report output dir    ${m.outputDir}`);

  lines.push("────────────────────────────────────────────────────────────");
  lines.push("");

  process.stdout.write(lines.join("\n"));
}
