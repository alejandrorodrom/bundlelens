import fs from "node:fs/promises";
import path from "node:path";
import { APP_CSS } from "./static/appCss.js";
import { APP_JS } from "./static/appJs.js";

/**
 * Escapes characters that would break an inline `<script type="application/json">` payload.
 *
 * @param json - Serialized JSON text.
 * @returns Safe string for embedding in HTML.
 */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Writes shared `assets/app.css` and `assets/app.js` under a report output directory.
 *
 * @param outputDirAbs - Report root (receives `assets/`).
 */
export async function writeReportStaticAssets(outputDirAbs: string): Promise<void> {
  const assetsDir = path.join(outputDirAbs, "assets");
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(path.join(assetsDir, "app.css"), APP_CSS, "utf8");
  await fs.writeFile(path.join(assetsDir, "app.js"), APP_JS, "utf8");
}
