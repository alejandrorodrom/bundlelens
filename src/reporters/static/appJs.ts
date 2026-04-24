export const APP_JS = `
(function () {
  function fmtBytes(n) {
    if (n === 0) return "0 B";
    var u = ["B", "KB", "MB", "GB"];
    var v = n;
    var i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return (i === 0 ? v : v < 10 ? v.toFixed(2) : v.toFixed(1)) + " " + u[i];
  }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "className") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function table(headers, rows, extraTableClass) {
    var tc = "data-table" + (extraTableClass ? " " + extraTableClass : "");
    var thead = el("thead", null, [
      el("tr", null, headers.map(function (h) {
        return el("th", { scope: "col" }, [document.createTextNode(h)]);
      }))
    ]);
    var tb = el("tbody", null, rows.map(function (r) {
      return el("tr", null, r.map(function (cell, i) {
        var td = el("td", { className: typeof cell === "number" ? "num" : "" }, [document.createTextNode(String(cell))]);
        return td;
      }));
    }));
    return el("table", { className: tc }, [thead, tb]);
  }

  /** opts: { id?, className?, lead? } */
  function section(title, body, opts) {
    opts = opts || {};
    var classes = ["bl-section"];
    if (opts.className) classes.push(opts.className);
    var attrs = { className: classes.join(" ") };
    if (opts.id) attrs.id = opts.id;
    var headKids = [el("h2", { className: "section-title", text: title })];
    if (opts.lead) headKids.push(el("p", { className: "section-lead", text: opts.lead }));
    var head = el("div", { className: "section-head" }, headKids);
    var inner = el("div", { className: "section-body" }, [body]);
    return el("section", attrs, [head, inner]);
  }

  function kvGrid(pairs, kvClass, gridExtraClass) {
    var kc = "kv" + (kvClass ? " " + kvClass : "");
    var gridClass = "grid2" + (gridExtraClass ? " " + gridExtraClass : "");
    var g = el("div", { className: gridClass }, pairs.map(function (p) {
      return el("div", { className: kc }, [
        el("div", { className: "k", text: p[0] }),
        el("div", { className: "v", text: p[1] })
      ]);
    }));
    return g;
  }

  function formatGeneratedAt(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      return String(iso);
    }
  }

  function modeLabel(mode) {
    if (mode === "run") return "Build + analysis";
    if (mode === "analyze") return "Directory analysis only";
    return mode ? String(mode) : "—";
  }

  function modeBadgeClass(mode) {
    if (mode === "run") return "mode-badge mode-run";
    if (mode === "analyze") return "mode-badge mode-analyze";
    return "mode-badge mode-unknown";
  }

  function statCard(label, value, hint) {
    var kids = [
      el("div", { className: "stat-label", text: label }),
      el("div", { className: "stat-value", text: value })
    ];
    if (hint) kids.push(el("div", { className: "stat-hint", text: hint }));
    return el("div", { className: "stat-card" }, kids);
  }

  function pathBlock(label, fullPath) {
    var p = String(fullPath || "");
    return el("div", { className: "path-block" }, [
      el("div", { className: "path-block-label", text: label }),
      el("code", { className: "path-value", title: p, text: p || "—" })
    ]);
  }

  function severityOrderIndex(k) {
    var order = ["critical", "high", "moderate", "low", "info", "unknown"];
    var i = order.indexOf(String(k || "").toLowerCase());
    return i === -1 ? 999 : i;
  }

  function sortedSeverityKeys(bySeverity) {
    var keys = Object.keys(bySeverity || {}).filter(function (k) {
      return (bySeverity[k] || 0) > 0;
    });
    keys.sort(function (a, b) {
      var va = severityOrderIndex(a);
      var vb = severityOrderIndex(b);
      if (va !== vb) return va - vb;
      return String(a).localeCompare(String(b));
    });
    return keys;
  }

  function auditCountRow(label, value) {
    return el("div", { className: "summary-audit-count-row" }, [
      el("span", { className: "summary-audit-count-k", text: label }),
      el("span", { className: "summary-audit-count-v", text: String(value) })
    ]);
  }

  function buildAuditSummarySection(audit) {
    if (!audit) return null;
    var wrap = el("div", { className: "summary-audit" });
    if (audit.status === "clean") {
      wrap.appendChild(el("h3", { className: "summary-block-title", text: "Vulnerabilities" }));
      wrap.appendChild(el("p", { className: "summary-audit-note", text: "No vulnerabilities were found in the dependency audit." }));
      return wrap;
    }
    if (audit.status === "requires_internet") {
      wrap.appendChild(el("h3", { className: "summary-block-title", text: "Vulnerabilities" }));
      wrap.appendChild(el("p", { className: "summary-audit-warn", text: audit.message || "Internet access is required." }));
      return wrap;
    }
    if (audit.status === "error") {
      wrap.appendChild(el("h3", { className: "summary-block-title", text: "Vulnerabilities" }));
      wrap.appendChild(el("p", { className: "summary-audit-err", text: audit.message || "The vulnerability analysis could not be completed." }));
      return wrap;
    }
    wrap.appendChild(el("h3", { className: "summary-block-title", text: "Vulnerabilities" }));
    var d = audit.byDirectness || { direct: 0, transitive: 0, unknown: 0 };
    var totalV =
      audit.total != null
        ? audit.total
        : (audit.vulnerabilities && audit.vulnerabilities.length) || 0;
    var countsWrap = el("div", { className: "summary-audit-counts" }, [
      auditCountRow("Total reported", totalV),
      auditCountRow("Direct dependencies", d.direct),
      auditCountRow("Transitive", d.transitive)
    ]);
    if (d.unknown > 0) {
      countsWrap.appendChild(auditCountRow("Unclassified", d.unknown));
    }
    wrap.appendChild(countsWrap);
    var sev = audit.bySeverity || {};
    var keys = sortedSeverityKeys(sev);
    if (keys.length) {
      wrap.appendChild(el("p", { className: "summary-audit-by-sev", text: "By severity" }));
      wrap.appendChild(el("div", { className: "sev-list" }, keys.map(function (k) {
        return el("div", { className: "sev-item" }, [
          severityBadge(k),
          el("span", { className: "sev-count", text: String(sev[k]) })
        ]);
      })));
    } else {
      wrap.appendChild(el("p", { className: "summary-audit-note", text: "No severity breakdown is available in the audit metadata." }));
    }
    return wrap;
  }

  function buildSummaryBody(m, sum, audit) {
    var totalFiles = sum.totalFiles ?? 0;
    var rawB = sum.totalRawBytes || 0;
    var gzB = sum.totalGzipBytes || 0;
    var brB = sum.totalBrotliBytes || 0;
    var gzHint = null;
    var brHint = null;
    if (rawB > 0 && gzB > 0 && gzB < rawB) {
      gzHint = "≈ " + Math.round((1 - gzB / rawB) * 100) + "% smaller than raw";
    }
    if (rawB > 0 && brB > 0 && brB < rawB) {
      brHint = "≈ " + Math.round((1 - brB / rawB) * 100) + "% smaller than raw";
    }
    var intro = el("p", {
      className: "summary-lead",
      text: "Quick view of the analyzed output directory and total indexed bundle size."
    });
    var stats = el("div", { className: "summary-stats" }, [
      statCard("Files", String(totalFiles), "Entries found in build output"),
      statCard("Raw size", fmtBytes(rawB), "Without HTTP compression"),
      statCard("Estimated gzip", fmtBytes(gzB), gzHint),
      statCard("Estimated brotli", fmtBytes(brB), brHint)
    ]);
    var mode = m.mode || "";
    var metaLeft = el("div", { className: "summary-meta-block" }, [
      el("h3", { className: "summary-block-title", text: "Report context" }),
      el("div", { className: "summary-row" }, [
        el("span", { className: "summary-row-k", text: "Generated" }),
        el("span", { className: "summary-row-v", title: m.generatedAt || "", text: formatGeneratedAt(m.generatedAt) })
      ]),
      el("div", { className: "summary-row" }, [
        el("span", { className: "summary-row-k", text: "BundleLens" }),
        el("span", { className: "summary-row-v", text: m.bundlelensVersion || "—" })
      ]),
      el("div", { className: "summary-row" }, [
        el("span", { className: "summary-row-k", text: "Mode" }),
        el("span", { className: "summary-row-v" }, [
          el("span", { className: modeBadgeClass(mode), text: modeLabel(mode) })
        ])
      ])
    ]);
    var metaRight = el("div", { className: "summary-meta-block" }, [
      el("h3", { className: "summary-block-title", text: "Paths" }),
      pathBlock("Analyzed build directory", m.buildDir),
      pathBlock("BundleLens report output", m.outputDir)
    ]);
    var meta = el("div", { className: "summary-meta" }, [metaLeft, metaRight]);
    var auditBlock = buildAuditSummarySection(audit);
    var layoutKids = [intro, stats];
    if (auditBlock) layoutKids.push(auditBlock);
    layoutKids.push(meta);
    return el("div", { className: "summary-layout" }, layoutKids);
  }

  function formatDurationMs(ms) {
    var n = Math.max(0, Math.round(Number(ms) || 0));
    if (n < 1000) return String(n) + " ms";
    var threeMin = 3 * 60 * 1000;
    if (n <= threeMin) {
      var sec = n / 1000;
      return sec < 10 ? sec.toFixed(2) + " s" : sec.toFixed(1) + " s";
    }
    var totalSec = Math.floor(n / 1000);
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    return String(mins) + "m " + String(secs) + "s";
  }

  function exitBadge(exitCode) {
    if (exitCode === null || exitCode === undefined) {
      return el("span", { className: "badge badge-warn", text: "No exit code" });
    }
    if (exitCode === 0) {
      return el("span", { className: "badge badge-ok", text: "Success (0)" });
    }
    return el("span", { className: "badge badge-err", text: "Failed (" + String(exitCode) + ")" });
  }

  function buildExecutionBody(build) {
    var wrap = el("div", null, []);
    var meta = el("div", { className: "build-meta" }, [
      el("div", { className: "build-stat" }, [
        el("div", { className: "k", text: "Duration" }),
        el("div", { className: "v", text: formatDurationMs(build.durationMs) })
      ]),
      el("div", { className: "build-stat" }, [
        el("div", { className: "k", text: "Exit code" }),
        el("div", { className: "v" }, [exitBadge(build.exitCode)])
      ])
    ]);
    wrap.appendChild(meta);
    wrap.appendChild(kvGrid(
      [
        ["Command", build.command],
        ["Start", build.startedAt],
        ["End", build.endedAt],
        ["CWD", build.cwd]
      ],
      "kv-code",
      "build-exec-grid"
    ));
    return wrap;
  }

  function tabGroup(idPrefix, items) {
    var wrap = el("div", { className: "tablist-wrap" }, []);
    var tablist = el("div", { className: "tablist", role: "tablist" }, []);
    var panelsRoot = el("div", { className: "tab-panels" }, []);
    items.forEach(function (item, idx) {
      var tid = idPrefix + "-tab-" + idx;
      var pid = idPrefix + "-panel-" + idx;
      var tab = el("button", {
        type: "button",
        className: "tab" + (idx === 0 ? " active" : ""),
        id: tid,
        role: "tab",
        "aria-selected": idx === 0 ? "true" : "false",
        "aria-controls": pid,
        tabindex: idx === 0 ? "0" : "-1",
        text: item.label
      });
      var panel = el("div", {
        className: "panel" + (idx === 0 ? "" : " hidden"),
        id: pid,
        role: "tabpanel",
        "aria-labelledby": tid
      }, []);
      var innerScroll = el("div", { className: "panel-scroll" }, [item.content]);
      panel.appendChild(innerScroll);
      function activate(i) {
        items.forEach(function (_, j) {
          var t = tablist.children[j];
          var p = panelsRoot.children[j];
          var on = j === i;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.setAttribute("tabindex", on ? "0" : "-1");
          p.classList.toggle("hidden", !on);
        });
      }
      tab.addEventListener("click", function () { activate(idx); });
      tab.addEventListener("keydown", function (ev) {
        var key = ev.key;
        var next = idx;
        if (key === "ArrowRight" || key === "ArrowDown") next = (idx + 1) % items.length;
        else if (key === "ArrowLeft" || key === "ArrowUp") next = (idx - 1 + items.length) % items.length;
        else if (key === "Home") next = 0;
        else if (key === "End") next = items.length - 1;
        else return;
        ev.preventDefault();
        activate(next);
        tablist.children[next].focus();
      });
      tablist.appendChild(tab);
      panelsRoot.appendChild(panel);
    });
    wrap.appendChild(tablist);
    wrap.appendChild(panelsRoot);
    return wrap;
  }

  function distLabel(key) {
    var map = {
      all: "All",
      javascript: "JavaScript",
      css: "CSS",
      image: "Images",
      font: "Fonts",
      sourcemap: "Source maps",
      other: "Other"
    };
    return map[key] || key;
  }

  function thresholdsTable(rows) {
    var thead = el("thead", null, [
      el("tr", null, [
        "Category", "Metric", "Configured", "Current", "File", "Status"
      ].map(function (h) {
        return el("th", { scope: "col" }, [document.createTextNode(h)]);
      }))
    ]);
    var tb = el("tbody", null, rows.map(function (t) {
      var badge = t.exceeded
        ? el("span", { className: "badge badge-err", text: "Exceeded" })
        : el("span", { className: "badge badge-ok", text: "OK" });
      return el("tr", null, [
        el("td", null, [document.createTextNode(t.category)]),
        el("td", null, [document.createTextNode(t.metric)]),
        el("td", { className: "num" }, [document.createTextNode(String(t.configuredValue))]),
        el("td", { className: "num" }, [document.createTextNode(String(t.actualValue))]),
        el("td", { className: "muted" }, [document.createTextNode(t.file || "—")]),
        el("td", null, [badge])
      ]);
    }));
    return el("table", { className: "data-table" }, [thead, tb]);
  }

  function buildToc(links) {
    return el("nav", { className: "toc", "aria-label": "Report sections" }, [
      el("p", { className: "toc-title", text: "On this page" }),
      el("ul", { className: "toc-list" }, links.map(function (L) {
        var li = el("li", null, []);
        li.appendChild(el("a", { href: "#" + L[0], text: L[1] }));
        return li;
      }))
    ]);
  }

  function severityClass(sev) {
    var s = String(sev || "unknown").toLowerCase();
    if (s === "critical") return "sev-critical";
    if (s === "high") return "sev-high";
    if (s === "moderate") return "sev-moderate";
    if (s === "low") return "sev-low";
    return "sev-unknown";
  }

  function severityBadge(sev) {
    var s = String(sev || "unknown").toLowerCase();
    return el("span", { className: "sev-badge " + severityClass(s), text: s });
  }

  function infoBanner(kind, text) {
    return el("div", { className: "audit-banner " + kind, text: text });
  }

  function normalizeText(x) {
    return String(x || "").toLowerCase();
  }

  function viaSummary(via) {
    if (Array.isArray(via)) return via.map(function (v) { return typeof v === "string" ? v : JSON.stringify(v); }).join(" | ");
    if (typeof via === "string") return via;
    if (via && typeof via === "object") return JSON.stringify(via);
    return "";
  }

  function compareBy(key, dir) {
    var m = dir === "asc" ? 1 : -1;
    return function (a, b) {
      if (key === "severity") {
        var order = { critical: 5, high: 4, moderate: 3, low: 2, info: 1, unknown: 0 };
        var av = order[normalizeText(a.severity)] ?? 0;
        var bv = order[normalizeText(b.severity)] ?? 0;
        return (av - bv) * m;
      }
      var ax = normalizeText(a[key]);
      var bx = normalizeText(b[key]);
      if (ax < bx) return -1 * m;
      if (ax > bx) return 1 * m;
      return 0;
    };
  }

  function vulnerabilitiesTable(list, title) {
    var wrap = el("div", { className: "vuln-col" }, []);
    wrap.appendChild(el("h3", { className: "audit-subtitle", text: title }));
    var state = { sortKey: "severity", sortDir: "desc", search: "" };
    var search = el("input", {
      className: "vuln-search",
      type: "search",
      placeholder: "Search package, severity, or range…",
      "aria-label": "Filter " + title
    });
    var tableWrap = el("div", null, []);
    function render() {
      tableWrap.innerHTML = "";
      var filtered = list.filter(function (v) {
        if (!state.search) return true;
        var hay = [
          normalizeText(v.package),
          normalizeText(v.severity),
          normalizeText(v.range),
          normalizeText(viaSummary(v.via))
        ].join(" ");
        return hay.indexOf(state.search) >= 0;
      }).slice().sort(compareBy(state.sortKey, state.sortDir));
      var vt = el("table", { className: "data-table vuln-table fixed-cols" }, []);
      var cg = el("colgroup", null, [
        el("col", { style: "width:42%" }),
        el("col", { style: "width:22%" }),
        el("col", { style: "width:36%" })
      ]);
      var headers = [
        { key: "package", label: "Package" },
        { key: "severity", label: "Severity" },
        { key: "range", label: "Range" }
      ];
      var vthead = el("thead", null, [
        el("tr", null, headers.map(function (h) {
          var th = el("th", { scope: "col" }, []);
          var sortMark = state.sortKey === h.key ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
          var btn = el("button", { type: "button", className: "th-sort", text: h.label + sortMark });
          btn.addEventListener("click", function () {
            if (state.sortKey === h.key) {
              state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            } else {
              state.sortKey = h.key;
              state.sortDir = h.key === "severity" ? "desc" : "asc";
            }
            render();
          });
          th.appendChild(btn);
          return th;
        }))
      ]);
      var vtbody = el("tbody", null, filtered.map(function (v) {
        return el("tr", null, [
          el("td", null, [document.createTextNode(String(v.package || ""))]),
          el("td", null, [severityBadge(v.severity)]),
          el("td", null, [document.createTextNode(String(v.range || ""))])
        ]);
      }));
      if (!filtered.length) {
        vtbody.appendChild(el("tr", null, [
          el("td", { className: "muted", colspan: "3", text: "No results for the current filter." })
        ]));
      }
      vt.appendChild(cg);
      vt.appendChild(vthead);
      vt.appendChild(vtbody);
      tableWrap.appendChild(vt);
    }
    search.addEventListener("input", function (e) {
      state.search = normalizeText(e.target && e.target.value);
      render();
    });
    wrap.appendChild(search);
    wrap.appendChild(tableWrap);
    render();
    return wrap;
  }

  function buildFullFilesSection(report) {
    var files = report.files || [];
    if (!files.length) return null;
    var fRows = files.map(function (f) {
      return [
        f.path,
        f.type,
        f.extension,
        fmtBytes(f.rawBytes),
        f.gzipBytes == null ? "n/a" : fmtBytes(f.gzipBytes),
        f.brotliBytes == null ? "n/a" : fmtBytes(f.brotliBytes),
        f.isSourceMap ? "yes" : "no",
        f.relatedSourceMap || "",
        f.relatedFile || "",
        f.nameHash || ""
      ];
    });
    var filesTable = table(
      ["Path", "Type", "Ext", "Raw", "Gzip", "Brotli", "Source map", "Related map", "Related file", "Name hash"],
      fRows,
      "files-table"
    );
    var filesWrap = el("div", { className: "table-scroll" }, [filesTable]);
    return section("Files", filesWrap, {
      id: "archivos",
      lead: "Complete list (" + files.length + " files). Scroll horizontally if needed."
    });
  }

  function buildFilesStubSection(fileCount) {
    var box = el("div", { className: "files-stub" }, [
      el("p", { className: "files-stub-text", text: "The full files table (" + fileCount + " entries) lives on a separate page to keep this overview shorter and faster." }),
      el("p", { className: "files-stub-meta", text: "You can also consume report.json directly for custom tooling or automation." }),
      el("a", { className: "files-stub-btn", href: "./files.html", text: "Open full file list →" })
    ]);
    return section("Files", box, {
      id: "archivos",
      lead: "Executive view with a link to file-level details."
    });
  }

  function buildRankingsSection(report) {
    var rk = report.rankings || {};
    var rkNames = [
      ["filesByRawBytes", "By raw bytes"],
      ["filesByGzipBytes", "By gzip bytes"],
      ["filesByBrotliBytes", "By brotli bytes"],
      ["javascriptByRawBytes", "JavaScript (raw)"],
      ["cssByRawBytes", "CSS (raw)"],
      ["assetsByRawBytes", "Assets without source maps (raw)"],
      ["sourceMapsByRawBytes", "Source maps (raw)"]
    ];
    var rkItems = rkNames.map(function (pair) {
      var key = pair[0];
      var label = pair[1];
      var list = rk[key] || [];
      var tbl = table(["Path", "Bytes"], list.map(function (x) { return [x.path, fmtBytes(x.bytes)]; }));
      return { label: label, content: tbl };
    });
    return section("Rankings", tabGroup("rk", rkItems), {
      id: "rankings",
      lead: "Largest paths by size. Use ← → when a tab is focused."
    });
  }

  function buildRankingsStubSection() {
    var box = el("div", { className: "files-stub" }, [
      el("p", { className: "files-stub-text", text: "Full ranking tables with tabs (raw, gzip, JS, CSS, and more) are available on a separate page to keep this report lightweight." }),
      el("a", { className: "files-stub-btn", href: "./rankings.html", text: "Open full rankings →" })
    ]);
    return section("Rankings", box, {
      id: "rankings",
      lead: "Executive view with a link to full ranking tables."
    });
  }

  var node = document.getElementById("bundlelens-report");
  if (!node) return;
  var report = JSON.parse(node.textContent || "{}");
  var root = document.getElementById("root");
  if (!root) return;

  var view =
    (document.documentElement && document.documentElement.getAttribute("data-bundlelens-view")) ||
    "index";

  if (view === "files") {
    var onlyFiles = buildFullFilesSection(report);
    if (onlyFiles) {
      root.appendChild(onlyFiles);
    } else {
      root.appendChild(el("p", { className: "section-lead", text: "No files are available in this report." }));
    }
    return;
  }

  if (view === "rankings") {
    root.appendChild(buildRankingsSection(report));
    return;
  }

  var m = report.metadata || {};
  var sum = report.summary || {};
  var build = report.build;

  var tocLinks = [["resumen", "Overview"]];
  if (build) tocLinks.push(["build", "Build"]);
  if (sum.byType && sum.byType.length) tocLinks.push(["composicion", "Composition"]);
  if (report.files && report.files.length) tocLinks.push(["archivos", "Files"]);
  tocLinks.push(["rankings", "Rankings"]);
  var dist = report.distributions || {};
  if (Object.keys(dist).length) tocLinks.push(["distribuciones", "Distributions"]);
  var pc = report.percentiles || {};
  if (Object.keys(pc).length) tocLinks.push(["percentiles", "Percentiles"]);
  var sm = (report.files || []).filter(function (f) { return f.isSourceMap || f.type === "sourcemap"; });
  if (sm.length) tocLinks.push(["sourcemaps", "Source maps"]);
  if (report.audit) tocLinks.push(["vulnerabilidades", "Vulnerabilities"]);
  if (report.thresholds && report.thresholds.length) tocLinks.push(["umbrales", "Thresholds"]);
  tocLinks.push(["json", "Raw JSON"]);
  root.appendChild(buildToc(tocLinks));

  root.appendChild(section("Overview", buildSummaryBody(m, sum, report.audit), {
    id: "resumen",
    className: "summary-panel",
    lead: "Aggregated metrics and report context."
  }));

  if (build) {
    root.appendChild(section("Build execution", buildExecutionBody(build), {
      id: "build",
      lead: "Executed command, duration, and outcome for traceability."
    }));
  }

  if (sum.byType && sum.byType.length) {
    var btRows = sum.byType.map(function (r) {
      return [
        r.type,
        String(r.count),
        fmtBytes(r.totalRawBytes),
        fmtBytes(r.totalGzipBytes),
        fmtBytes(r.totalBrotliBytes),
        (r.percentOfFiles || 0).toFixed(2) + "%",
        (r.percentOfRawBytes || 0).toFixed(2) + "%"
      ];
    });
    var compTable = table(
      ["Type", "Count", "Raw", "Gzip", "Brotli", "% files", "% raw bytes"],
      btRows
    );
    var compWrap = el("div", { className: "table-scroll" }, [compTable]);
    root.appendChild(section("Composition by file type", compWrap, {
      id: "composicion",
      lead: "How total size is distributed across file types in the output directory."
    }));
  }

  if (report.files && report.files.length) {
    root.appendChild(buildFilesStubSection(report.files.length));
  }

  root.appendChild(buildRankingsStubSection());

  if (Object.keys(dist).length) {
    var distKeys = Object.keys(dist);
    var distItems = distKeys.map(function (dk) {
      var g = dist[dk];
      var rows = Object.keys(g).map(function (b) { return [b, String(g[b])]; });
      var tbl = table(["Bucket", "Files"], rows);
      return { label: distLabel(dk), content: tbl };
    });
    root.appendChild(section("Size distributions (raw bytes)", tabGroup("dist", distItems), {
      id: "distribuciones",
      lead: "Number of files in each size bucket, grouped by content type."
    }));
  }

  if (Object.keys(pc).length) {
    var pcKeys = Object.keys(pc);
    var prow = pcKeys.map(function (k) {
      var s = pc[k] || {};
      return [distLabel(k), fmtBytes(s.p50 || 0), fmtBytes(s.p75 || 0), fmtBytes(s.p90 || 0), fmtBytes(s.p95 || 0), fmtBytes(s.p99 || 0)];
    });
    var pcWrap = el("div", { className: "table-scroll" }, [
      table(["Group", "p50", "p75", "p90", "p95", "p99"], prow)
    ]);
    root.appendChild(section("Percentiles (raw bytes)", pcWrap, {
      id: "percentiles",
      lead: "Typical raw size by group, including median and tail percentiles (p90, p99)."
    }));
  }

  if (sm.length) {
    var smWrap = el("div", { className: "table-scroll" }, [
      table(
        ["Path", "Raw", "Related file"],
        sm.map(function (f) { return [f.path, fmtBytes(f.rawBytes), f.relatedFile || ""]; })
      )
    ]);
    root.appendChild(section("Source maps", smWrap, {
      id: "sourcemaps",
      lead: "Detected source maps and their likely related compiled files."
    }));
  }

  if (report.audit) {
    var a = report.audit;
    var sev = a.bySeverity || {};
    var aw = el("div", null, []);
    var directness = a.byDirectness || { direct: 0, transitive: 0, unknown: 0 };
    aw.appendChild(kvGrid([
      ["Total", a.total == null ? "n/a" : String(a.total)],
      ["Direct", String(directness.direct || 0)],
      ["Transitive", String(directness.transitive || 0)],
      ["Unclassified", String(directness.unknown || 0)]
    ]));
    if (a.status === "requires_internet") {
      aw.appendChild(infoBanner("warn", a.message || "Internet access is required."));
    } else if (a.status === "clean") {
      aw.appendChild(infoBanner("ok", "✔ No vulnerabilities were found."));
    } else if (a.status === "error") {
      aw.appendChild(infoBanner("error", a.message || "Vulnerability analysis could not be completed."));
    }
    var sevKeys = Object.keys(sev);
    if (sevKeys.length) {
      var sevWrap = el("div", { className: "sev-list" }, sevKeys.map(function (k) {
        return el("div", { className: "sev-item" }, [
          severityBadge(k),
          el("span", { className: "sev-count", text: String(sev[k]) })
        ]);
      }));
      aw.appendChild(sevWrap);
    }
    if (a.vulnerabilities && a.vulnerabilities.length) {
      var direct = a.vulnerabilities.filter(function (v) { return v.isDirect === true; });
      var transitive = a.vulnerabilities.filter(function (v) { return v.isDirect === false; });
      var unknown = a.vulnerabilities.filter(function (v) { return v.isDirect == null; });
      var cols = el("div", { className: "vuln-columns" }, []);
      if (direct.length) cols.appendChild(vulnerabilitiesTable(direct, "Direct"));
      if (transitive.length) cols.appendChild(vulnerabilitiesTable(transitive, "Transitive"));
      aw.appendChild(cols);
      if (unknown.length) {
        aw.appendChild(el("h3", { className: "audit-subtitle", text: "Unclassified" }));
        aw.appendChild(vulnerabilitiesTable(unknown, "Unclassified"));
      }
    }
    root.appendChild(section("Vulnerabilities", aw, {
      id: "vulnerabilidades",
      lead: "Dependency risk summary from npm audit, when available."
    }));
  }

  if (report.thresholds && report.thresholds.length) {
    var thWrap = el("div", { className: "table-scroll" }, [thresholdsTable(report.thresholds)]);
    root.appendChild(section("Thresholds", thWrap, {
      id: "umbrales",
      lead: "Comparison against limits configured for this analysis."
    }));
  }

  var jsonStr = JSON.stringify(report, null, 2);
  var jsonBlock = el("details", { className: "json-details" }, [
    el("summary", { className: "json-summary", text: "Show full report JSON" }),
    el("pre", { className: "raw" }, [document.createTextNode(jsonStr)])
  ]);
  root.appendChild(section("Raw JSON data", jsonBlock, {
    id: "json",
    lead: "Optional: inspect or copy the full payload for integrations and debugging."
  }));
})();
`;
