/** Shared report stylesheet (single bundle for index/files/rankings/treemap/compare views). */
export const APP_CSS = `
:root {
  --bg: #0c1017;
  --panel: #151c28;
  --panel-elevated: #1a2332;
  --text: #e8edf5;
  --muted: #8b99ad;
  --border: #2a3548;
  --accent: #6b9aff;
  --accent-soft: rgba(107, 154, 255, 0.14);
  --radius: 10px;
  --radius-sm: 6px;
  --focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.55;
  font-size: 0.9375rem;
}
a { color: var(--accent); }
a:hover { text-decoration: underline; }
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0.75rem;
  z-index: 1000;
  padding: 0.45rem 0.75rem;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}
.skip-link:focus {
  left: 0.75rem;
  outline: none;
  box-shadow: var(--focus);
}
.bl-header {
  padding: 1.35rem 1.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--panel) 0%, var(--bg) 100%);
}
.bl-header-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem 1.5rem;
}
.bl-header-titles {
  flex: 1 1 12rem;
  min-width: 0;
}
.bl-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.bl-pdf-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}
.bl-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}
.bl-action-btn {
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.88rem;
  font-family: inherit;
  cursor: pointer;
  line-height: 1.2;
}
a.bl-action-link {
  text-decoration: none;
  display: inline-block;
  text-align: center;
}
.bl-action-btn:hover {
  color: var(--text);
  border-color: var(--text);
}
.bl-action-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
.bl-pdf-hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.35;
  max-width: 36ch;
  text-align: right;
}
.bl-pdf-hint code {
  font-size: 0.88em;
  padding: 0.08rem 0.3rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text);
}
.bl-sub {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  max-width: 52ch;
}
.bl-sub code {
  font-size: 0.88em;
  padding: 0.12rem 0.4rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text);
}
.files-stub {
  padding: 1rem 1.1rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.files-stub-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text);
}
.files-stub-meta {
  margin: 0.55rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.45;
}
.files-stub-btn {
  display: inline-block;
  margin-top: 0.85rem;
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.88rem;
  text-decoration: none;
}
.files-stub-btn:hover {
  color: var(--text);
  border-color: var(--text);
  text-decoration: none;
}
.treemap-ui {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.treemap-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}
.treemap-toolbar-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  margin-right: 0.35rem;
}
.treemap-metric-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}
.treemap-metric-btn {
  appearance: none;
  cursor: pointer;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.treemap-metric-btn:hover {
  color: var(--text);
  border-color: var(--accent);
}
.treemap-metric-btn.is-active {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.treemap-metric-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
.treemap-maps-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}
.treemap-maps-toggle input {
  accent-color: var(--accent);
}
.treemap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.85rem;
}
.treemap-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--muted);
}
.treemap-legend-swatch {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(232, 237, 245, 0.25);
  background-color: var(--muted);
}
.treemap-label.treemap-folder-label {
  fill: #c5d0e0;
  font-size: 10px;
  font-weight: 650;
}
.treemap-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.2rem;
  font-size: 0.88rem;
}
.treemap-crumb-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  font: inherit;
  font-weight: 600;
}
.treemap-crumb-btn:hover {
  background: var(--accent-soft);
  text-decoration: underline;
}
.treemap-crumb-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
.treemap-crumb-sep {
  color: var(--muted);
  user-select: none;
}
.treemap-stage {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #0b0f14;
  overflow: hidden;
  min-height: 360px;
}
.treemap-stage.is-empty {
  display: none;
}
.treemap-svg {
  display: block;
  width: 100%;
  height: auto;
}
.treemap-cell {
  cursor: default;
}
.treemap-cell.is-folder {
  cursor: pointer;
}
.treemap-cell:hover rect {
  filter: brightness(1.12);
}
.treemap-label,
.treemap-label-sub {
  fill: var(--text);
  font-size: 11px;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  pointer-events: none;
  paint-order: stroke;
  stroke: rgba(12, 16, 23, 0.75);
  stroke-width: 3px;
}
.treemap-label {
  font-weight: 650;
}
.treemap-label-sub {
  fill: var(--muted);
  font-size: 10px;
  font-weight: 500;
}
.treemap-tooltip {
  position: fixed;
  z-index: 40;
  max-width: min(28rem, calc(100vw - 1.5rem));
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--panel-elevated);
  color: var(--text);
  font-size: 0.8rem;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.treemap-empty {
  margin: 0;
  padding: 1rem 1.1rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 0.9rem;
  background: #0b0f14;
}
main {
  padding: 1.25rem 1.25rem 1.75rem;
  max-width: 1180px;
  margin: 0 auto;
}
#root > .bl-section:last-child {
  margin-bottom: 0;
}
@media (min-width: 768px) {
  main { padding-left: 1.75rem; padding-right: 1.75rem; }
}

.toc {
  position: sticky;
  top: 0;
  z-index: 50;
  margin: 0 0 1.25rem;
  padding: 0.65rem 0.85rem;
  background: rgba(12, 16, 23, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
}
.toc-title {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.toc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.toc-list a {
  display: inline-block;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  color: var(--muted);
  text-decoration: none;
  border: 1px solid transparent;
}
.toc-list a:hover {
  color: var(--text);
  background: var(--accent-soft);
  border-color: var(--border);
}
.toc-list a:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}

.bl-section {
  margin-bottom: 1.35rem;
  background: var(--panel-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0;
  overflow: hidden;
}
.section-head {
  padding: 1rem 1.15rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: rgba(11, 15, 20, 0.45);
}
.section-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: -0.01em;
}
.section-lead {
  margin: 0.45rem 0 0;
  font-size: 0.86rem;
  color: var(--muted);
  line-height: 1.45;
  max-width: 65ch;
}
.section-body {
  padding: 1rem 1.15rem 1.15rem;
}

section.summary-panel .section-head {
  border-bottom: none;
  background: transparent;
}
section.summary-panel .section-body {
  padding-top: 0;
}

table.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  overflow-wrap: anywhere;
}
.data-table thead th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(11, 15, 20, 0.65);
}
.data-table tbody tr:hover td {
  background: rgba(107, 154, 255, 0.04);
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.muted { color: var(--muted); }
pre.raw {
  overflow: auto;
  max-height: min(70vh, 520px);
  background: #0b0f14;
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  border: 1px solid var(--border);
  margin: 0;
}
.json-details {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #0b0f14;
  overflow: hidden;
}
.json-summary {
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text);
  list-style: none;
  user-select: none;
}
.json-summary::-webkit-details-marker { display: none; }
.json-summary:hover { background: rgba(107, 154, 255, 0.06); }
.json-details[open] .json-summary {
  border-bottom: 1px solid var(--border);
  color: var(--accent);
}
.json-details .raw {
  border: none;
  border-radius: 0;
  max-height: min(65vh, 480px);
}
.json-details:not([open]) .raw {
  display: none !important;
  max-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden !important;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.65rem;
}
.grid2.build-exec-grid {
  grid-template-columns: 1fr;
  gap: 0.55rem;
}
.build-exec-grid .kv {
  display: grid;
  grid-template-columns: minmax(5.75rem, 8.25rem) minmax(0, 1fr);
  gap: 0.65rem 1rem;
  align-items: start;
}
.build-exec-grid .kv .k {
  text-align: right;
  padding-top: 0.14rem;
}
.build-exec-grid .kv .v {
  margin-top: 0;
}
@media (max-width: 520px) {
  .build-exec-grid .kv {
    grid-template-columns: 1fr;
  }
  .build-exec-grid .kv .k {
    text-align: left;
    padding-top: 0;
  }
  .build-exec-grid .kv .v {
    margin-top: 0.15rem;
  }
}
.kv {
  padding: 0.55rem 0.75rem;
  background: #0b0f14;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.kv .k {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}
.kv .v {
  font-size: 0.9rem;
  word-break: break-word;
  margin-top: 0.2rem;
}
.kv-code .v {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
}

.build-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}
.build-stat {
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
}
.build-stat .k {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.build-stat .v {
  font-size: 1.05rem;
  font-weight: 700;
  margin-top: 0.15rem;
  font-variant-numeric: tabular-nums;
}
.build-stat .v.sub {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--muted);
}

.badge {
  display: inline-block;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid var(--border);
}
.badge-ok {
  background: #132d1f;
  color: #b9f4ce;
  border-color: #2a6b3f;
}
.badge-warn {
  background: #3d2a12;
  color: #fce8a5;
  border-color: #7f5a1f;
}
.badge-err {
  background: #3a1218;
  color: #ffc8cf;
  border-color: #8b2230;
}

.tablist-wrap {
  margin-bottom: 0.65rem;
}
.tablist {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tab {
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #0b0f14;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--muted);
  font-family: inherit;
  line-height: 1.2;
}
.tab:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.tab.active {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
.panel.hidden { display: none; }
.panel-scroll {
  overflow-x: auto;
  margin-top: 0.25rem;
}

.hidden { display: none; }

.sev-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 1rem;
}
.sev-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
}
.sev-count {
  font-size: 0.8rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.sev-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}
.sev-critical { background: #4f1219; color: #ffc8cf; border: 1px solid #8b2230; }
.sev-high { background: #4f2612; color: #ffd9c8; border: 1px solid #9b4522; }
.sev-moderate { background: #4f4312; color: #ffedc8; border: 1px solid #8f7a22; }
.sev-low { background: #12384f; color: #c8e9ff; border: 1px solid #225f85; }
.sev-unknown { background: #2b3240; color: #dce4f0; border: 1px solid #4a5568; }

.audit-banner {
  margin: 0.75rem 0 0.9rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 0.86rem;
}
.audit-banner.ok {
  background: #113320;
  border-color: #1e6d3c;
  color: #b9f4ce;
}
.audit-banner.warn {
  background: #3d3412;
  border-color: #7f6a1f;
  color: #fce8a5;
}
.audit-banner.error {
  background: #42171c;
  border-color: #87303b;
  color: #ffc8cf;
}

.audit-subtitle {
  margin: 0.9rem 0 0.45rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}
.table-scroll {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #0b0f14;
}
.table-scroll .data-table {
  margin: 0;
}
.files-table {
  min-width: 1180px;
}
.vuln-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 0.9rem;
  align-items: start;
}
.vuln-col {
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.7rem;
}
.vuln-search {
  width: 100%;
  margin: 0.2rem 0 0.6rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #111821;
  color: var(--text);
  font-family: inherit;
}
.vuln-search:focus-visible {
  outline: none;
  box-shadow: var(--focus);
}
.fixed-cols { table-layout: fixed; }
.th-sort {
  all: unset;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
}
.th-sort:hover { color: var(--accent); }
.th-sort:focus-visible {
  outline: none;
  box-shadow: var(--focus);
  border-radius: 4px;
}

section.summary-panel .section-head {
  padding-bottom: 0.5rem;
}
.summary-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.report-generated-bar {
  margin: 0 0 1.1rem;
  padding: 0.55rem 0.85rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.5;
}
.report-generated-label {
  color: var(--muted);
}
.report-generated-time {
  color: var(--text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.report-generated-meta {
  color: var(--muted);
  font-weight: 400;
  font-size: 0.8125rem;
}
.summary-meta-vuln-summary .summary-audit {
  margin-bottom: 0;
}
.summary-lead {
  margin: 0 0 1rem;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.45;
  max-width: 58ch;
}
.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.15rem;
}
.stat-card {
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem;
  min-height: 5.1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.12rem;
}
.stat-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.stat-value {
  font-size: 1.28rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--text);
}
.stat-hint {
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.35;
  min-height: 1.1em;
}
.summary-audit {
  margin-bottom: 1rem;
  padding: 0.75rem 0.9rem;
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.summary-audit .summary-block-title {
  margin-bottom: 0.45rem;
}
.summary-audit-note {
  margin: 0;
  font-size: 0.86rem;
  color: var(--muted);
  line-height: 1.45;
}
.summary-audit-hint {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
}
.summary-audit-counts {
  margin: 0 0 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  font-size: 0.8125rem;
}
.summary-audit-count-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  max-width: 22rem;
}
.summary-audit-count-k {
  color: var(--muted);
}
.summary-audit-count-v {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text);
}
.summary-audit-by-sev {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.insights-stack {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.insights-stack > .audit-subtitle {
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}
.insights-stack > .audit-subtitle:first-child {
  margin-top: 0;
}
.insights-stack > .table-scroll {
  margin-bottom: 0.15rem;
}
.insights-path-list {
  max-height: 14rem;
  margin-top: 0.35rem;
  font-size: 0.75rem;
}
.summary-audit-warn {
  margin: 0;
  font-size: 0.86rem;
  color: #fce8a5;
  line-height: 1.45;
}
.summary-audit-err {
  margin: 0;
  font-size: 0.86rem;
  color: #ffc8cf;
  line-height: 1.45;
}
.summary-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.85rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.summary-meta-block {
  background: #0b0f14;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.95rem;
}
.summary-block-title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.summary-row {
  display: flex;
  gap: 0.6rem;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.32rem 0;
  border-bottom: 1px solid rgba(45, 58, 77, 0.55);
}
.summary-row:last-child {
  border-bottom: none;
}
.summary-row-k {
  flex: 0 0 auto;
  font-size: 0.78rem;
  color: var(--muted);
}
.summary-row-v {
  flex: 1;
  text-align: right;
  font-size: 0.86rem;
  word-break: break-word;
}
.path-block {
  margin: 0.45rem 0 0;
}
.path-block:first-of-type {
  margin-top: 0.15rem;
}
.path-block-label {
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}
.path-value {
  display: block;
  font-size: 0.78rem;
  background: #111821;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.55rem;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.4;
}
.mode-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  border: 1px solid var(--border);
}
.mode-run {
  background: #13264a;
  color: #cfe2ff;
  border-color: #2b4c8a;
}
.mode-analyze {
  background: #254016;
  color: #d6f5c8;
  border-color: #3a6b2f;
}
.mode-unknown {
  background: #2b3240;
  color: var(--text);
}

html[data-bundlelens-view="compare"] .bl-sub {
  max-width: 52rem;
}
.compare-top-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1.25rem;
  margin: 0.75rem 0 1.15rem;
}
.compare-branch-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0;
  font-size: 0.82rem;
  min-width: 0;
}
.compare-generated-at {
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.compare-branch-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #151b26;
  max-width: min(100%, 42rem);
}
.compare-branch-pill-label {
  color: var(--muted);
  white-space: nowrap;
}
.compare-branch-pill-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compare-branch-pill.base {
  border-color: #3d5a80;
  background: #152032;
}
.compare-branch-pill.head {
  border-color: #2f6b4a;
  background: #152818;
}
.compare-indicator-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 1rem 0 0.5rem;
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 0.35rem 0;
  background: linear-gradient(180deg, var(--bg) 70%, transparent);
}
.compare-indicator-nav button {
  font: inherit;
  font-size: 0.78rem;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #1a2230;
  color: var(--text);
  cursor: pointer;
}
.compare-indicator-nav button:hover {
  border-color: var(--accent);
}
.compare-indicator-nav button.active {
  border-color: var(--accent);
  background: #1e2d45;
  color: #fff;
}
.compare-section-panel {
  scroll-margin-top: 4.5rem;
}
.compare-table-wrap {
  overflow-x: auto;
  margin-top: 0.35rem;
}
table.compare-diff-table {
  width: 100%;
  min-width: 28rem;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.compare-diff-table th,
.compare-diff-table td {
  border: 1px solid var(--border);
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}
.compare-diff-table th {
  background: #151b26;
  font-weight: 600;
}
.compare-diff-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.compare-diff-table .metric {
  font-weight: 500;
  max-width: 14rem;
}
.delta-pos {
  color: #f87171;
}
.delta-neg {
  color: #4ade80;
}
.delta-zero {
  color: var(--muted);
}
.delta-hint {
  font-size: 0.72rem;
  color: var(--muted);
  display: block;
  margin-top: 0.15rem;
}
.delta-symbol {
  font-weight: 700;
}
.compare-audit-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 1rem;
  align-items: start;
}
.compare-audit-side {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem 0.85rem;
  background: var(--panel-elevated);
}
.compare-audit-side-title {
  margin-top: 0;
}
.compare-audit-side-body .kv-grid {
  margin-bottom: 0.35rem;
}


@page {
  margin: 0;
  size: auto;
}
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html {
    scroll-behavior: auto;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: none !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: none !important;
  }
  .no-print,
  .skip-link,
  .toc {
    display: none !important;
  }
  .bl-header {
    width: 100%;
    box-sizing: border-box;
    padding: 0.45rem 0.5rem 0.55rem;
    break-inside: avoid;
    break-after: avoid;
  }
  .bl-header-inner {
    max-width: none;
    width: 100%;
  }
  .bl-section {
    width: 100%;
    box-sizing: border-box;
    break-inside: auto;
    page-break-inside: auto;
    overflow: visible;
  }
  .data-table {
    width: 100%;
  }
  .section-head {
    break-after: avoid;
    page-break-after: avoid;
  }
  main {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0.35rem 0 0.5rem !important;
    box-sizing: border-box;
  }
  #root {
    width: 100%;
    max-width: none;
  }
  .table-scroll,
  .panel-scroll {
    overflow: visible !important;
  }
  .files-table {
    min-width: 0;
  }
}
`;
