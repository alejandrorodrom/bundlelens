import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensCompareReport } from "../types/report.js";
import { readBundleLensVersion } from "../utils/version.js";
import { APP_CSS } from "./static/appCss.js";
import { APP_JS } from "./static/appJs.js";

function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

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

export async function writeCompareHtmlReport(
  payload: BundleLensCompareReport,
  outputDirAbs: string
): Promise<{ compareHtmlPath: string; compareJsonPath: string }> {
  const assetsDir = path.join(outputDirAbs, "assets");
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(path.join(assetsDir, "app.css"), APP_CSS, "utf8");
  await fs.writeFile(path.join(assetsDir, "app.js"), APP_JS, "utf8");

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
