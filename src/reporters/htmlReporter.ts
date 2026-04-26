import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensReport } from "../types/report.js";
import {
  buildReportHtmlShell,
  escapeJsonForScript,
  writeReportStaticAssets,
} from "./htmlAssets.js";

function htmlShell(options: {
  title: string;
  subtitle: string;
  view: "index" | "files" | "rankings";
  escapedJson: string;
}): string {
  const { title, subtitle, view, escapedJson } = options;
  const headExtra =
    view === "files"
      ? `<style media="print">@page { size: landscape; margin: 0; }</style>`
      : undefined;
  return buildReportHtmlShell({
    dataView: view,
    pageTitle: title,
    subtitle,
    escapedJson,
    jsonHref: "./report.json",
    jsonDownload: "bundlelens-report.json",
    pdfHintInner:
      "PDF: print dialog → Save as PDF. JSON: full report as <code>report.json</code>.",
    headExtra,
  });
}

/** Writes `index.html`, optional `files.html`, `rankings.html`, and shared assets. */
export async function writeHtmlReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<{
  indexPath: string;
  filesPath: string | null;
  rankingsPath: string;
}> {
  await writeReportStaticAssets(outputDirAbs);

  const escaped = escapeJsonForScript(JSON.stringify(report));

  const indexHtml = htmlShell({
    title: "BundleLens",
    subtitle:
      "Build output metrics and key report insights. Use the sections below to open detailed views for files and size rankings.",
    view: "index",
    escapedJson: escaped,
  });

  const indexPath = path.join(outputDirAbs, "index.html");
  await fs.writeFile(indexPath, indexHtml, "utf8");

  const fileCount = report.files?.length ?? 0;
  let filesPath: string | null = null;
  if (fileCount > 0) {
    const filesHtmlPath = path.join(outputDirAbs, "files.html");
    const filesHtml = htmlShell({
      title: "BundleLens · Files",
      subtitle: `<span class="no-print"><a href="./index.html">← Back to main report</a> · </span>${fileCount} indexed file(s).`,
      view: "files",
      escapedJson: escaped,
    });
    await fs.writeFile(filesHtmlPath, filesHtml, "utf8");
    filesPath = filesHtmlPath;
  }

  const rankingsHtmlPath = path.join(outputDirAbs, "rankings.html");
  const rankingsHtml = htmlShell({
    title: "BundleLens · Rankings",
    subtitle:
      '<span class="no-print"><a href="./index.html">← Back to main report</a> · </span>Top paths by size across multiple tabs.',
    view: "rankings",
    escapedJson: escaped,
  });
  await fs.writeFile(rankingsHtmlPath, rankingsHtml, "utf8");

  return { indexPath, filesPath, rankingsPath: rankingsHtmlPath };
}
