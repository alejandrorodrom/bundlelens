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
.bl-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
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
main {
  padding: 1.25rem 1.25rem 3.5rem;
  max-width: 1180px;
  margin: 0 auto;
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

.grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.65rem;
}
/* Build execution: one row per field, label column + value column (not tiny left-stacked tiles). */
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
`;
