import fs from "node:fs/promises";
import path from "node:path";
import type { AuditReport, AuditVulnerability } from "../types/report.js";
import dns from "node:dns/promises";
import { runShellCommand } from "../utils/shell.js";

/** How we run the audit (aligned with lockfile priority in `dependencies.ts`). */
type AuditMode = "pnpm" | "yarn-npm" | "yarn-classic" | "bun" | "npm";

async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks pnpm / Yarn Berry (`yarn npm audit`) / Yarn Classic / Bun / npm from lockfiles under `cwd`.
 */
async function resolveAuditMode(cwd: string): Promise<AuditMode> {
  const p = (...parts: string[]) => path.join(cwd, ...parts);
  if (await pathExists(p("pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (await pathExists(p("yarn.lock"))) {
    const [hasBerryRc, hasBerryReleases] = await Promise.all([
      pathExists(p(".yarnrc.yml")),
      pathExists(p(".yarn", "releases")),
    ]);
    if (hasBerryRc || hasBerryReleases) {
      return "yarn-npm";
    }
    return "yarn-classic";
  }
  const [hasBunLockb, hasBunLock] = await Promise.all([
    pathExists(p("bun.lockb")),
    pathExists(p("bun.lock")),
  ]);
  if (hasBunLockb || hasBunLock) {
    return "bun";
  }
  return "npm";
}

function auditShellCommand(mode: AuditMode): string {
  switch (mode) {
    case "pnpm":
      return "pnpm audit --json";
    case "yarn-npm":
      return "yarn npm audit --json";
    case "yarn-classic":
      return "yarn audit --json";
    case "bun":
      return "bun audit --json";
    default:
      return "npm audit --json";
  }
}

/**
 * Yarn v1 `--json` is NDJSON; we fold `auditAdvisory` lines into an npm-like `vulnerabilities` map.
 */
function yarnClassicNdjsonToNpmShape(stdout: string): Record<string, unknown> {
  const vulnerabilities: Record<string, unknown> = {};
  let n = 0;
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (row.type !== "auditAdvisory" || typeof row.data !== "object") {
      continue;
    }
    const data = row.data as Record<string, unknown>;
    const advisory =
      data.advisory && typeof data.advisory === "object"
        ? (data.advisory as Record<string, unknown>)
        : {};
    const moduleName =
      typeof advisory.module_name === "string"
        ? advisory.module_name
        : "unknown";
    const id =
      typeof advisory.id === "number"
        ? advisory.id
        : typeof advisory.github_advisory_id === "string"
          ? advisory.github_advisory_id
          : n++;
    const key = `${moduleName}#${id}`;
    const resolution =
      typeof data.resolution === "string" ? data.resolution : null;
    const severity =
      typeof advisory.severity === "string" ? advisory.severity : "unknown";
    const range =
      typeof advisory.vulnerable_versions === "string"
        ? advisory.vulnerable_versions
        : typeof advisory.findings === "string"
          ? String(advisory.findings)
          : resolution;
    const via =
      typeof advisory.cve === "string"
        ? advisory.cve
        : typeof advisory.title === "string"
          ? advisory.title
          : typeof advisory.url === "string"
            ? advisory.url
            : advisory;
    const pathStr = typeof data.path === "string" ? data.path : "";
    let isDirect: boolean | null = null;
    if (pathStr) {
      isDirect = !pathStr.includes(">");
    }
    vulnerabilities[key] = {
      severity,
      isDirect,
      via,
      range,
      nodes: data.path ?? data.paths,
      fixAvailable:
        typeof advisory.patched_versions === "string"
          ? advisory.patched_versions !== "undefined"
          : null,
    };
  }
  return { vulnerabilities };
}

function vulnerabilityMapSize(root: unknown): number {
  if (!root || typeof root !== "object") return 0;
  const v = (root as Record<string, unknown>).vulnerabilities;
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  return Object.keys(v as Record<string, unknown>).length;
}

/**
 * @param stdout - Single JSON document (npm / pnpm / Berry / Bun when compatible).
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
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      dns.lookup("registry.npmjs.org"),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("timeout")), 1500);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Runs a package-manager audit in `cwd` (command chosen from lockfiles: pnpm, Yarn, Bun, npm).
 *
 * @param cwd - Project root (directory with `package.json` / lockfile).
 * @returns Structured audit report (including offline/error states).
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

  const mode = await resolveAuditMode(cwd);
  const command = auditShellCommand(mode);
  const result = await runShellCommand(command, cwd);

  let raw: unknown;
  if (mode === "yarn-classic") {
    raw = yarnClassicNdjsonToNpmShape(result.stdout);
    if (vulnerabilityMapSize(raw) === 0 && result.stderr.trim()) {
      raw = parseAuditJson(result.stdout);
    }
  } else {
    raw = parseAuditJson(result.stdout);
  }

  const parseFailed =
    raw &&
    typeof raw === "object" &&
    "parseNote" in (raw as Record<string, unknown>);
  const vulnerabilities = extractVulnerabilities(raw);

  if (
    (raw === null || parseFailed) &&
    result.stderr.trim() &&
    vulnerabilities.length === 0
  ) {
    return {
      status: "error",
      message: "No se pudo obtener el resultado de vulnerabilidades.",
      total: null,
      bySeverity: {},
      byDirectness: { direct: 0, transitive: 0, unknown: 0 },
      vulnerabilities: [],
      raw: {
        auditCommand: command,
        auditMode: mode,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    };
  }

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

  const rawOut =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>), auditCommand: command, auditMode: mode }
      : { value: raw, auditCommand: command, auditMode: mode };

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
    raw: rawOut,
  };
}
