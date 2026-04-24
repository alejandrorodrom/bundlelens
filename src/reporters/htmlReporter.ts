import fs from "node:fs/promises";
import path from "node:path";
import type { BundleLensReport } from "../types/report.js";
import { APP_CSS } from "./static/appCss.js";
import { APP_JS } from "./static/appJs.js";

function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function htmlShell(options: {
  title: string;
  subtitle: string;
  view: "index" | "files" | "rankings";
  escapedJson: string;
}): string {
  const { title, subtitle, view, escapedJson } = options;
  return `<!DOCTYPE html>
<html lang="en" data-bundlelens-view="${view}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="./assets/app.css" />
</head>
<body>
  <a class="skip-link" href="#report-content">Skip to content</a>
  <header class="bl-header">
    <h1>${title}</h1>
    <p class="bl-sub">${subtitle}</p>
  </header>
  <main id="report-content">
    <div id="root"></div>
  </main>
  <script type="application/json" id="bundlelens-report">${escapedJson}</script>
  <script src="./assets/app.js"></script>
</body>
</html>`;
}

export async function writeHtmlReport(
  report: BundleLensReport,
  outputDirAbs: string
): Promise<{
  indexPath: string;
  filesPath: string | null;
  rankingsPath: string;
}> {
  const assetsDir = path.join(outputDirAbs, "assets");
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(path.join(assetsDir, "app.css"), APP_CSS, "utf8");
  await fs.writeFile(path.join(assetsDir, "app.js"), APP_JS, "utf8");

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
      subtitle: `<a href="./index.html">← Back to main report</a> · ${fileCount} indexed file(s).`,
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
      '<a href="./index.html">← Back to main report</a> · Top paths by size across multiple tabs.',
    view: "rankings",
    escapedJson: escaped,
  });
  await fs.writeFile(rankingsHtmlPath, rankingsHtml, "utf8");

  return { indexPath, filesPath, rankingsPath: rankingsHtmlPath };
}
