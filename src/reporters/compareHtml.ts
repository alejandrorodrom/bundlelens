import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensCompareReport } from "../types/report.js";
import { readBundleLensVersion } from "../utils/version.js";
import {
  buildReportHtmlShell,
  escapeJsonForScript,
  writeReportStaticAssets,
} from "./htmlAssets.js";

function compareHtmlShell(escapedJson: string): string {
  return buildReportHtmlShell({
    dataView: "compare",
    pageTitle: "BundleLens · Compare branches",
    heading: "BundleLens · Compare",
    subtitle:
      "Side-by-side metrics and deltas between two Git refs. Use the bar below to jump between indicator blocks.",
    escapedJson,
    jsonHref: "./compare-report.json",
    jsonDownload: "bundlelens-compare-report.json",
    pdfHintInner: "PDF: print dialog → Save as PDF.",
  });
}

/** Writes `compare.html`, `compare-report.json`, and shared assets. */
export async function writeCompareHtmlReport(
  payload: BundleLensCompareReport,
  outputDirAbs: string
): Promise<{ compareHtmlPath: string; compareJsonPath: string }> {
  await writeReportStaticAssets(outputDirAbs);

  const body: BundleLensCompareReport = {
    ...payload,
    bundlelensVersion: readBundleLensVersion(),
  };

  const jsonRaw = JSON.stringify(body, null, 2);
  const compareJsonPath = path.join(outputDirAbs, "compare-report.json");
  await fs.writeFile(compareJsonPath, jsonRaw, "utf8");

  const compareHtmlPath = path.join(outputDirAbs, "compare.html");
  await fs.writeFile(
    compareHtmlPath,
    compareHtmlShell(escapeJsonForScript(JSON.stringify(body))),
    "utf8"
  );

  return { compareHtmlPath, compareJsonPath };
}
