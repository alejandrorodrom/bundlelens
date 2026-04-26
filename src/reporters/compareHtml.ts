import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensCompareReport } from "../types/report.js";
import { readBundleLensVersion } from "../utils/version.js";
import { escapeJsonForScript, writeReportStaticAssets } from "./htmlAssets.js";

/**
 * HTML document shell for the compare view (embeds report JSON and loads `app.js`).
 *
 * @param escapedJson - JSON text already passed through `escapeJsonForScript`.
 * @returns Full HTML string.
 */
function compareHtmlShell(escapedJson: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-bundlelens-view="compare">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BundleLens · Compare branches</title>
  <link rel="stylesheet" href="./assets/app.css" />
</head>
<body>
  <a class="skip-link" href="#report-content">Skip to content</a>
  <header class="bl-header">
    <div class="bl-header-inner">
      <div class="bl-header-titles">
        <h1>BundleLens · Compare</h1>
        <p class="bl-sub">Side-by-side metrics and deltas between two Git refs. Use the bar below to jump between indicator blocks.</p>
      </div>
      <div class="bl-pdf-wrap no-print">
        <div class="bl-header-actions">
          <button type="button" class="bl-action-btn" id="bundlelens-pdf">Save as PDF</button>
          <a
            class="bl-action-btn bl-action-link"
            href="./compare-report.json"
            download="bundlelens-compare-report.json"
          >Download JSON</a>
        </div>
        <span class="bl-pdf-hint">PDF: print dialog → Save as PDF.</span>
      </div>
    </div>
  </header>
  <main id="report-content">
    <div id="root"></div>
  </main>
  <script type="application/json" id="bundlelens-report">${escapedJson}</script>
  <script src="./assets/app.js"></script>
</body>
</html>`;
}

/**
 * Writes `compare.html`, `compare-report.json`, and shared static assets for branch compare.
 *
 * @param payload - Base/head reports and ref metadata.
 * @param outputDirAbs - Directory that will contain `compare.html`, JSON, and `assets/`.
 * @returns Paths to the written HTML and JSON files.
 */
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
