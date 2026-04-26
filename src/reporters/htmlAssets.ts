import fs from "node:fs/promises";
import path from "node:path";
import { APP_CSS } from "./static/appCss.js";
import { APP_JS } from "./static/appJs.js";

/** Escapes JSON for embedding in `<script type="application/json">`. */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Trusted markup fields (`subtitle`, `pdfHintInner`, `headExtra`) must not contain user-controlled HTML.
 */
export type ReportHtmlShellOptions = {
  dataView: string;
  pageTitle: string;
  heading?: string;
  subtitle: string;
  escapedJson: string;
  jsonHref: string;
  jsonDownload: string;
  pdfHintInner: string;
  headExtra?: string;
};

/** Full static report HTML: layout, embedded JSON, `app.js`. */
export function buildReportHtmlShell(options: ReportHtmlShellOptions): string {
  const headTail = options.headExtra
    ? `\n  ${options.headExtra.trim()}`
    : "";
  return `<!DOCTYPE html>
<html lang="en" data-bundlelens-view="${options.dataView}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.pageTitle}</title>
  <link rel="stylesheet" href="./assets/app.css" />${headTail}
</head>
<body>
  <a class="skip-link" href="#report-content">Skip to content</a>
  <header class="bl-header">
    <div class="bl-header-inner">
      <div class="bl-header-titles">
        <h1>${options.heading ?? options.pageTitle}</h1>
        <p class="bl-sub">${options.subtitle}</p>
      </div>
      <div class="bl-pdf-wrap no-print">
        <div class="bl-header-actions">
          <button type="button" class="bl-action-btn" id="bundlelens-pdf">Save as PDF</button>
          <a
            class="bl-action-btn bl-action-link"
            href="${options.jsonHref}"
            download="${options.jsonDownload}"
          >Download JSON</a>
        </div>
        <span class="bl-pdf-hint">${options.pdfHintInner}</span>
      </div>
    </div>
  </header>
  <main id="report-content">
    <div id="root"></div>
  </main>
  <script type="application/json" id="bundlelens-report">${options.escapedJson}</script>
  <script src="./assets/app.js"></script>
</body>
</html>`;
}

/** Writes `assets/app.css` and `assets/app.js` under the report directory. */
export async function writeReportStaticAssets(outputDirAbs: string): Promise<void> {
  const assetsDir = path.join(outputDirAbs, "assets");
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(path.join(assetsDir, "app.css"), APP_CSS, "utf8");
  await fs.writeFile(path.join(assetsDir, "app.js"), APP_JS, "utf8");
}
