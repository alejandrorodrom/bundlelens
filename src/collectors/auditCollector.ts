import type { AuditReport, AuditVulnerability } from "../types/report.js";
import dns from "node:dns/promises";
import { runShellCommand } from "../utils/shell.js";

/**
 * @param stdout - Raw `npm audit --json` stdout (may be empty).
 * @returns Parsed JSON, or a small diagnostic object when JSON is invalid.
 */
function parseAuditJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { parseNote: "invalid_json", raw: stdout.slice(0, 5000) };
  }
}

/**
 * @param data - Parsed audit JSON root object.
 * @returns Flattened vulnerability rows (empty when missing).
 */
function extractVulnerabilities(data: unknown): AuditVulnerability[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const vulns = root.vulnerabilities;
  if (!vulns || typeof vulns !== "object") return [];

  const out: AuditVulnerability[] = [];
  for (const [pkgName, v] of Object.entries(vulns)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const via = o.via;
    const nodes = o.nodes;
    const fixAvailable = o.fixAvailable;
    const severity =
      typeof o.severity === "string" ? o.severity : "unknown";
    const isDirect =
      typeof o.isDirect === "boolean" ? o.isDirect : null;
    const range = typeof o.range === "string" ? o.range : null;
    out.push({
      package: pkgName,
      severity,
      isDirect,
      via,
      range,
      nodes,
      fixAvailable,
    });
  }
  return out;
}

/**
 * @param vulnerabilities - Parsed vulnerability list.
 * @returns Counts keyed by severity label.
 */
function countBySeverity(vulnerabilities: AuditVulnerability[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of vulnerabilities) {
    const s = v.severity || "unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param vulnerabilities - Parsed vulnerability list.
 * @returns Direct vs transitive vs unknown counts.
 */
function countByDirectness(vulnerabilities: AuditVulnerability[]): {
  direct: number;
  transitive: number;
  unknown: number;
} {
  const counts = { direct: 0, transitive: 0, unknown: 0 };
  for (const v of vulnerabilities) {
    if (v.isDirect === true) {
      counts.direct += 1;
    } else if (v.isDirect === false) {
      counts.transitive += 1;
    } else {
      counts.unknown += 1;
    }
  }
  return counts;
}

/**
 * @returns Whether a quick DNS lookup to `registry.npmjs.org` succeeds.
 */
async function hasInternetConnectivity(): Promise<boolean> {
  try {
    await Promise.race([
      dns.lookup("registry.npmjs.org"),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 1500);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs `npm audit --json` in `cwd` and normalizes the result (or offline/error states).
 *
 * @param cwd - Directory where `npm audit` should run (package root).
 * @returns Structured audit report (including offline/error statuses).
 */
export async function collectNpmAudit(cwd: string): Promise<AuditReport | null> {
  const online = await hasInternetConnectivity();
  if (!online) {
    return {
      status: "requires_internet",
      message: "Se requiere conexión a internet para analizar vulnerabilidades.",
      total: null,
      bySeverity: {},
      byDirectness: { direct: 0, transitive: 0, unknown: 0 },
      vulnerabilities: [],
      raw: { note: "requires_internet" },
    };
  }

  const result = await runShellCommand("npm audit --json", cwd);
  const raw = parseAuditJson(result.stdout);
  if (raw === null && result.stderr) {
    return {
      status: "error",
      message: "No se pudo obtener el resultado de vulnerabilidades.",
      total: null,
      bySeverity: {},
      byDirectness: { direct: 0, transitive: 0, unknown: 0 },
      vulnerabilities: [],
      raw: { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode },
    };
  }

  const vulnerabilities = extractVulnerabilities(raw);
  const bySeverity = countBySeverity(vulnerabilities);
  const byDirectness = countByDirectness(vulnerabilities);
  const metadata =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).metadata
      : undefined;
  let total: number | null = null;
  if (metadata && typeof metadata === "object") {
    const m = metadata as Record<string, unknown>;
    const v = m.vulnerabilities;
    if (v && typeof v === "object") {
      const vo = v as Record<string, unknown>;
      const t = vo.total;
      if (typeof t === "number") total = t;
    }
  }
  if (total === null) {
    total = vulnerabilities.length;
  }

  return {
    status: vulnerabilities.length > 0 ? "ok" : "clean",
    message:
      vulnerabilities.length > 0
        ? null
        : "No se detectaron vulnerabilidades en las dependencias analizadas.",
    total,
    bySeverity,
    byDirectness,
    vulnerabilities,
    raw,
  };
}
