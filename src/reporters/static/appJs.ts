/** Client-side script for rendering report JSON into the static HTML shells. */
import { DISTRIBUTION_SLICE_KEYS } from "../../analyzers/distributionAnalyzer.js";

const DISTRIBUTION_KEYS_JSON = JSON.stringify([...DISTRIBUTION_SLICE_KEYS]);

export const APP_JS = `
(function () {
  (function setupPdfButton() {
    var pdfBtn = document.getElementById("bundlelens-pdf");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        window.print();
      });
    }
  })();

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

  function section(title, body, opts) {
    opts = opts || {};
    var classes = ["bl-section"];
    if (opts.className) classes.push(opts.className);
    var attrs = { className: classes.join(" ") };
    if (opts.id) attrs.id = opts.id;
    var headKids = [el("h2", { className: "section-title", text: title })];
    if (opts.lead) {
      var leadCls = "section-lead" + (opts.leadClassName ? " " + opts.leadClassName : "");
      headKids.push(el("p", { className: leadCls, text: opts.lead }));
    }
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

  var SEVERITY_ORDER = ["critical", "high", "moderate", "low", "info", "unknown"];
  function severityOrderIndex(k) {
    var i = SEVERITY_ORDER.indexOf(String(k || "").toLowerCase());
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
    wrap.appendChild(el("p", { className: "summary-audit-hint", text: "See the full Vulnerabilities section below for CVE listings." }));
    return wrap;
  }

  function buildVulnerabilitiesSectionBody(a) {
    var sev = a.bySeverity || {};
    var aw = el("div", { className: "vulnerabilities-detail-inner" }, []);
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
    return aw;
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
    var metaKids = [];
    if (audit) {
      var auditSummary = buildAuditSummarySection(audit);
      if (auditSummary) {
        metaKids.push(
          el("div", { className: "summary-meta-block summary-meta-vuln-summary" }, [auditSummary])
        );
      }
    }
    var metaRight = el("div", { className: "summary-meta-block" }, [
      el("h3", { className: "summary-block-title", text: "Paths" }),
      pathBlock("Analyzed build directory", m.buildDir),
      pathBlock("BundleLens report output", m.outputDir)
    ]);
    metaKids.push(metaRight);
    var meta = el("div", { className: "summary-meta" }, metaKids);
    var layoutKids = [intro, stats, meta];
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

  function fmtRatioPct(r) {
    if (r == null || typeof r !== "number" || r !== r) return "—";
    return (r * 100).toFixed(1) + "%";
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
      placeholder: "Package, severity, range, CVE…",
      "aria-label": "Filter " + title
    });
    var tableWrap = el("div", null, []);
    function render() {
      tableWrap.innerHTML = "";
      var filtered = list.filter(function (v) {
        if (!state.search) return true;
        var nodesHay =
          v.nodes == null
            ? ""
            : typeof v.nodes === "string"
              ? v.nodes
              : JSON.stringify(v.nodes);
        var fixHay =
          v.fixAvailable == null
            ? ""
            : typeof v.fixAvailable === "boolean"
              ? String(v.fixAvailable)
              : JSON.stringify(v.fixAvailable);
        var hay = [
          normalizeText(v.package),
          normalizeText(v.severity),
          normalizeText(v.range),
          normalizeText(viaSummary(v.via)),
          normalizeText(nodesHay),
          normalizeText(fixHay)
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
      var inp = e.currentTarget;
      state.search = normalizeText(inp && inp.value);
      render();
    });
    wrap.appendChild(search);
    wrap.appendChild(tableWrap);
    render();
    return wrap;
  }

  function buildAuditCompareSide(audit, sideTitle) {
    var box = el("div", { className: "compare-audit-side" }, []);
    box.appendChild(el("h3", { className: "audit-subtitle compare-audit-side-title", text: sideTitle }));
    if (!audit) {
      box.appendChild(el("p", { className: "section-lead", text: "No vulnerability scan for this side." }));
      return box;
    }
    var sev = audit.bySeverity || {};
    var aw = el("div", { className: "compare-audit-side-body" }, []);
    var directness = audit.byDirectness || { direct: 0, transitive: 0, unknown: 0 };
    aw.appendChild(kvGrid([
      ["Total", audit.total == null ? "n/a" : String(audit.total)],
      ["Direct", String(directness.direct || 0)],
      ["Transitive", String(directness.transitive || 0)],
      ["Unclassified", String(directness.unknown || 0)]
    ]));
    if (audit.status === "requires_internet") {
      aw.appendChild(infoBanner("warn", audit.message || "Internet access is required."));
    } else if (audit.status === "clean") {
      aw.appendChild(infoBanner("ok", "✔ No vulnerabilities were found."));
    } else if (audit.status === "error") {
      aw.appendChild(infoBanner("error", audit.message || "Vulnerability analysis could not be completed."));
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
    if (audit.vulnerabilities && audit.vulnerabilities.length) {
      var direct = audit.vulnerabilities.filter(function (v) { return v.isDirect === true; });
      var transitive = audit.vulnerabilities.filter(function (v) { return v.isDirect === false; });
      var unknown = audit.vulnerabilities.filter(function (v) { return v.isDirect == null; });
      var cols = el("div", { className: "vuln-columns" }, []);
      if (direct.length) cols.appendChild(vulnerabilitiesTable(direct, "Direct"));
      if (transitive.length) cols.appendChild(vulnerabilitiesTable(transitive, "Transitive"));
      aw.appendChild(cols);
      if (unknown.length) {
        aw.appendChild(el("h3", { className: "audit-subtitle", text: "Unclassified" }));
        aw.appendChild(vulnerabilitiesTable(unknown, "Unclassified"));
      }
    }
    box.appendChild(aw);
    return box;
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
      id: "files",
      lead: "Complete list (" + files.length + " files). Scroll horizontally if needed.",
      leadClassName: "no-print"
    });
  }

  function buildFilesStubSection(fileCount) {
    var box = el("div", { className: "files-stub" }, [
      el("p", { className: "files-stub-text", text: "The full files table (" + fileCount + " entries) lives on a separate page to keep this overview shorter and faster." }),
      el("p", { className: "files-stub-meta", text: "You can also consume report.json directly for custom tooling or automation." }),
      el("a", { className: "files-stub-btn", href: "./files.html", text: "Open full file list →" })
    ]);
    return section("Files", box, {
      id: "files",
      className: "no-print",
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
      lead: "Largest paths by size. Use ← → when a tab is focused.",
      leadClassName: "no-print"
    });
  }

  function buildRankingsStubSection() {
    var box = el("div", { className: "files-stub" }, [
      el("p", { className: "files-stub-text", text: "Full ranking tables with tabs (raw, gzip, JS, CSS, and more) are available on a separate page to keep this report lightweight." }),
      el("a", { className: "files-stub-btn", href: "./rankings.html", text: "Open full rankings →" })
    ]);
    return section("Rankings", box, {
      id: "rankings",
      className: "no-print",
      lead: "Executive view with a link to full ranking tables."
    });
  }

  function buildTreemapStubSection(fileCount) {
    var box = el("div", { className: "files-stub" }, [
      el("p", { className: "files-stub-text", text: "A spatial treemap of the " + fileCount + " indexed files (by folder path and size) lives on a separate page." }),
      el("p", { className: "files-stub-meta", text: "Switch between raw, gzip, and brotli; zoom into folders; hover for details." }),
      el("a", { className: "files-stub-btn", href: "./treemap.html", text: "Open file treemap →" })
    ]);
    return section("Treemap", box, {
      id: "treemap",
      className: "no-print",
      lead: "Executive view with a link to the spatial file map."
    });
  }

  var TREEMAP_TYPE_COLORS = {
    javascript: "#4f8cff",
    css: "#2dd4a8",
    image: "#f59e3b",
    font: "#c084fc",
    sourcemap: "#94a3b8",
    html: "#fbbf24",
    json: "#7dd3fc",
    wasm: "#fb7185",
    media: "#2dd4bf",
    other: "#a8b3c7"
  };

  function treemapTypeColor(type) {
    return TREEMAP_TYPE_COLORS[type] || TREEMAP_TYPE_COLORS.other;
  }

  function treemapMetricBytes(file, metric) {
    if (metric === "gzip") return file.gzipBytes;
    if (metric === "brotli") return file.brotliBytes;
    return file.rawBytes;
  }

  function filterTreemapFiles(files, metric, includeMaps) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!includeMaps && (f.isSourceMap || f.type === "sourcemap")) continue;
      var bytes = treemapMetricBytes(f, metric);
      if (bytes == null || !(bytes > 0)) continue;
      out.push(f);
    }
    return out;
  }

  function buildTreemapPathTree(files, metric) {
    var root = { name: "", path: "", value: 0, type: null, children: {}, isLeaf: false };
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var bytes = treemapMetricBytes(f, metric);
      var parts = String(f.path || "").split("/").filter(function (p) { return p.length > 0; });
      if (!parts.length) parts = [f.path || "(unnamed)"];
      var node = root;
      var acc = [];
      for (var j = 0; j < parts.length; j++) {
        var part = parts[j];
        acc.push(part);
        var isLast = j === parts.length - 1;
        if (isLast) {
          var leafKey = part + "\\0" + f.path;
          node.children[leafKey] = {
            name: part,
            path: f.path,
            value: bytes,
            type: f.type || "other",
            children: null,
            isLeaf: true,
            rawBytes: f.rawBytes,
            gzipBytes: f.gzipBytes,
            brotliBytes: f.brotliBytes
          };
        } else {
          if (!node.children[part]) {
            node.children[part] = {
              name: part,
              path: acc.join("/"),
              value: 0,
              type: null,
              children: {},
              isLeaf: false
            };
          }
          node = node.children[part];
        }
      }
    }
    function finalize(n) {
      if (n.isLeaf) return n.value;
      var kids = [];
      var sum = 0;
      Object.keys(n.children).forEach(function (k) {
        var c = n.children[k];
        var v = finalize(c);
        if (v > 0) {
          kids.push(c);
          sum += v;
        }
      });
      kids.sort(function (a, b) { return b.value - a.value; });
      n.children = kids;
      n.value = sum;
      return sum;
    }
    finalize(root);
    root.name = "(root)";
    root.path = "";
    return root;
  }

  function squarifyLayout(nodes, x, y, w, h) {
    var rects = [];
    if (!nodes || !nodes.length || w <= 0 || h <= 0) return rects;

    var items = [];
    for (var t = 0; t < nodes.length; t++) {
      if (nodes[t].value > 0) items.push({ node: nodes[t], value: nodes[t].value });
    }
    if (!items.length) return rects;

    function sumValues(list) {
      var s = 0;
      for (var i = 0; i < list.length; i++) s += list[i].value;
      return s;
    }

    function worst(row, length, rowSum) {
      if (!row.length || !(rowSum > 0) || !(length > 0)) return Infinity;
      var max = 0;
      var min = Infinity;
      for (var i = 0; i < row.length; i++) {
        var v = row[i].value;
        if (v > max) max = v;
        if (v < min) min = v;
      }
      var s2 = rowSum * rowSum;
      var l2 = length * length;
      return Math.max((l2 * max) / s2, s2 / (l2 * min));
    }

    function layoutRow(row, x0, y0, w0, h0, horizontal, remainingTotal) {
      var s = sumValues(row);
      if (!(s > 0) || !(remainingTotal > 0)) return 0;
      if (horizontal) {
        var rowH = (s / remainingTotal) * h0;
        var cx = x0;
        for (var j = 0; j < row.length; j++) {
          var rw = (row[j].value / s) * w0;
          rects.push({ node: row[j].node, x: cx, y: y0, w: rw, h: rowH });
          cx += rw;
        }
        return rowH;
      }
      var rowW = (s / remainingTotal) * w0;
      var cy = y0;
      for (var k = 0; k < row.length; k++) {
        var rh = (row[k].value / s) * h0;
        rects.push({ node: row[k].node, x: x0, y: cy, w: rowW, h: rh });
        cy += rh;
      }
      return rowW;
    }

    function step(remaining, x0, y0, w0, h0) {
      if (!remaining.length || w0 <= 0 || h0 <= 0) return;
      var remainingTotal = sumValues(remaining);
      if (!(remainingTotal > 0)) return;
      var horizontal = w0 >= h0;
      var length = horizontal ? w0 : h0;
      var row = [];
      var rowSum = 0;
      while (remaining.length) {
        var candidate = remaining[0];
        var nextSum = rowSum + candidate.value;
        var nextRow = row.concat([candidate]);
        if (row.length && worst(nextRow, length, nextSum) > worst(row, length, rowSum)) break;
        row = nextRow;
        rowSum = nextSum;
        remaining.shift();
      }
      var used = layoutRow(row, x0, y0, w0, h0, horizontal, remainingTotal);
      if (horizontal) {
        step(remaining, x0, y0 + used, w0, h0 - used);
      } else {
        step(remaining, x0 + used, y0, w0 - used, h0);
      }
    }

    step(items.slice(), x, y, w, h);
    return rects;
  }

  function buildTreemapSection(report) {
    var files = report.files || [];
    var state = {
      metric: "raw",
      includeMaps: false,
      stack: []
    };

    var wrap = el("div", { className: "treemap-ui" }, []);
    var toolbar = el("div", { className: "treemap-toolbar no-print" }, []);
    var metricGroup = el("div", { className: "treemap-metric-group" }, [
      el("span", { className: "treemap-toolbar-label", text: "Size" })
    ]);
    var metrics = [
      ["raw", "Raw"],
      ["gzip", "Gzip"],
      ["brotli", "Brotli"]
    ];
    var metricBtns = {};
    metrics.forEach(function (pair) {
      var btn = el("button", {
        type: "button",
        className: "treemap-metric-btn" + (pair[0] === state.metric ? " is-active" : ""),
        "data-metric": pair[0],
        text: pair[1]
      });
      metricBtns[pair[0]] = btn;
      metricGroup.appendChild(btn);
    });
    toolbar.appendChild(metricGroup);

    var mapsLabel = el("label", { className: "treemap-maps-toggle" }, []);
    var mapsCb = el("input", { type: "checkbox" });
    mapsCb.checked = state.includeMaps;
    mapsLabel.appendChild(mapsCb);
    mapsLabel.appendChild(document.createTextNode(" Include source maps"));
    toolbar.appendChild(mapsLabel);

    var legend = el("div", { className: "treemap-legend no-print" }, []);
    Object.keys(TREEMAP_TYPE_COLORS).forEach(function (type) {
      var swatch = el("span", { className: "treemap-legend-swatch", "data-type": type });
      swatch.style.backgroundColor = TREEMAP_TYPE_COLORS[type];
      legend.appendChild(el("span", { className: "treemap-legend-item" }, [
        swatch,
        el("span", { text: type })
      ]));
    });

    var crumb = el("div", { className: "treemap-breadcrumb no-print" }, []);
    var stage = el("div", { className: "treemap-stage" }, []);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "treemap-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "File size treemap");
    stage.appendChild(svg);

    var tooltip = el("div", { className: "treemap-tooltip", hidden: "hidden" }, []);
    var emptyMsg = el("p", { className: "treemap-empty", text: "" });
    emptyMsg.hidden = true;

    wrap.appendChild(toolbar);
    wrap.appendChild(legend);
    wrap.appendChild(crumb);
    wrap.appendChild(stage);
    wrap.appendChild(tooltip);
    wrap.appendChild(emptyMsg);

    function hideTooltip() {
      tooltip.hidden = true;
      tooltip.textContent = "";
    }

    function showTooltip(evt, node, bytes) {
      var lines = [
        node.path || node.name || "(root)",
        (node.isLeaf ? (node.type || "other") + " · " : "folder · ") + fmtBytes(bytes)
      ];
      if (node.isLeaf) {
        lines.push(
          "raw " + fmtBytes(node.rawBytes || 0) +
          " · gzip " + (node.gzipBytes == null ? "n/a" : fmtBytes(node.gzipBytes)) +
          " · brotli " + (node.brotliBytes == null ? "n/a" : fmtBytes(node.brotliBytes))
        );
      }
      tooltip.textContent = "";
      lines.forEach(function (line, idx) {
        if (idx) tooltip.appendChild(el("br"));
        tooltip.appendChild(document.createTextNode(line));
      });
      tooltip.hidden = false;
      var pad = 12;
      var tw = tooltip.offsetWidth || 180;
      var th = tooltip.offsetHeight || 48;
      var left = evt.clientX + pad;
      var top = evt.clientY + pad;
      if (left + tw > window.innerWidth - 8) left = evt.clientX - tw - pad;
      if (top + th > window.innerHeight - 8) top = evt.clientY - th - pad;
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }

    function currentRoot(tree) {
      var node = tree;
      for (var i = 0; i < state.stack.length; i++) {
        var want = state.stack[i];
        var kids = node.children || [];
        var found = null;
        for (var k = 0; k < kids.length; k++) {
          if (kids[k].path === want || kids[k].name === want) {
            found = kids[k];
            break;
          }
        }
        if (!found) break;
        node = found;
      }
      return node;
    }

    function renderBreadcrumb() {
      crumb.textContent = "";
      var rootBtn = el("button", { type: "button", className: "treemap-crumb-btn", text: "root" });
      rootBtn.addEventListener("click", function () {
        state.stack = [];
        render();
      });
      crumb.appendChild(rootBtn);
      for (var i = 0; i < state.stack.length; i++) {
        (function (idx) {
          crumb.appendChild(el("span", { className: "treemap-crumb-sep", text: "/" }));
          var label = state.stack[idx].split("/").pop() || state.stack[idx];
          var btn = el("button", { type: "button", className: "treemap-crumb-btn", text: label });
          btn.addEventListener("click", function () {
            state.stack = state.stack.slice(0, idx + 1);
            render();
          });
          crumb.appendChild(btn);
        })(i);
      }
    }

    function render() {
      Object.keys(metricBtns).forEach(function (m) {
        metricBtns[m].className = "treemap-metric-btn" + (m === state.metric ? " is-active" : "");
      });
      mapsCb.checked = state.includeMaps;

      var filtered = filterTreemapFiles(files, state.metric, state.includeMaps);
      var tree = buildTreemapPathTree(filtered, state.metric);
      renderBreadcrumb();
      var focus = currentRoot(tree);

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      hideTooltip();

      if (!focus || !(focus.value > 0)) {
        emptyMsg.hidden = false;
        emptyMsg.textContent = filtered.length
          ? "Nothing to show at this zoom level for the selected metric."
          : "No files match the current filters (try another size metric or include source maps).";
        stage.classList.add("is-empty");
        return;
      }
      emptyMsg.hidden = true;
      stage.classList.remove("is-empty");

      var width = Math.max(320, stage.clientWidth || 960);
      var height = Math.max(360, Math.min(640, Math.round(width * 0.62)));
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", String(height));

      var PAD = 1.5;
      var HEADER_H = 18;

      function attachHover(g, n) {
        g.addEventListener("mousemove", function (evt) {
          showTooltip(evt, n, n.value);
        });
        g.addEventListener("mouseleave", hideTooltip);
      }

      function paintLeaf(n, x, y, w, h) {
        if (w < 0.5 || h < 0.5) return;
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "treemap-cell is-leaf");
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(x));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(w));
        rect.setAttribute("height", String(h));
        rect.setAttribute("fill", treemapTypeColor(n.type));
        rect.setAttribute("stroke", "#0c1017");
        rect.setAttribute("stroke-width", "1");
        g.appendChild(rect);
        if (w > 44 && h > 22) {
          var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", String(x + 6));
          label.setAttribute("y", String(y + 14));
          label.setAttribute("class", "treemap-label");
          var maxChars = Math.max(4, Math.floor((w - 10) / 6.5));
          var name = n.name || "";
          label.textContent = name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
          g.appendChild(label);
          if (h > 36) {
            var sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sub.setAttribute("x", String(x + 6));
            sub.setAttribute("y", String(y + 28));
            sub.setAttribute("class", "treemap-label-sub");
            sub.textContent = fmtBytes(n.value);
            g.appendChild(sub);
          }
        }
        attachHover(g, n);
        svg.appendChild(g);
      }

      function paintFolder(n, x, y, w, h, depth) {
        if (w < 0.5 || h < 0.5) return;
        var header = depth > 0 && h > HEADER_H + 8 ? HEADER_H : 0;
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "treemap-cell is-folder");
        var frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        frame.setAttribute("x", String(x));
        frame.setAttribute("y", String(y));
        frame.setAttribute("width", String(w));
        frame.setAttribute("height", String(h));
        frame.setAttribute("fill", depth === 0 ? "transparent" : "#121a27");
        frame.setAttribute("stroke", "rgba(107,154,255,0.45)");
        frame.setAttribute("stroke-width", "1.25");
        g.appendChild(frame);
        if (header > 0) {
          var head = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          head.setAttribute("x", String(x));
          head.setAttribute("y", String(y));
          head.setAttribute("width", String(w));
          head.setAttribute("height", String(header));
          head.setAttribute("fill", "#243044");
          g.appendChild(head);
          if (w > 36) {
            var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(x + 6));
            label.setAttribute("y", String(y + 13));
            label.setAttribute("class", "treemap-label treemap-folder-label");
            var maxChars = Math.max(3, Math.floor((w - 10) / 6.5));
            var name = n.name || "";
            label.textContent = name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
            g.appendChild(label);
          }
        }
        attachHover(g, n);
        g.addEventListener("click", function (evt) {
          evt.stopPropagation();
          state.stack.push(n.path || n.name);
          render();
        });
        svg.appendChild(g);

        var innerX = x + PAD;
        var innerY = y + header + PAD;
        var innerW = w - PAD * 2;
        var innerH = h - header - PAD * 2;
        if (innerW > 1 && innerH > 1) {
          paintChildren(n.children || [], innerX, innerY, innerW, innerH, depth + 1);
        }
      }

      function paintChildren(children, x, y, w, h, depth) {
        var layoutNodes = (children || []).filter(function (n) { return n.value > 0; });
        if (!layoutNodes.length) return;
        var rects = squarifyLayout(layoutNodes, x, y, w, h);
        rects.forEach(function (r) {
          var n = r.node;
          var rx = r.x + PAD * 0.35;
          var ry = r.y + PAD * 0.35;
          var rw = Math.max(0, r.w - PAD * 0.7);
          var rh = Math.max(0, r.h - PAD * 0.7);
          if (n.isLeaf) paintLeaf(n, rx, ry, rw, rh);
          else paintFolder(n, rx, ry, rw, rh, depth);
        });
      }

      if (focus.isLeaf) {
        paintLeaf(focus, PAD, PAD, width - PAD * 2, height - PAD * 2);
      } else {
        paintChildren(focus.children || [], 0, 0, width, height, 0);
      }
    }

    Object.keys(metricBtns).forEach(function (m) {
      metricBtns[m].addEventListener("click", function () {
        state.metric = m;
        state.stack = [];
        render();
      });
    });
    mapsCb.addEventListener("change", function () {
      state.includeMaps = !!mapsCb.checked;
      state.stack = [];
      render();
    });

    // Defer first layout so stage has a measured width.
    requestAnimationFrame(function () { render(); });
    window.addEventListener("resize", function () {
      render();
    });

    return section("Treemap", wrap, {
      id: "treemap",
      lead: "Rectangle area is proportional to the selected size metric. Click a folder to zoom; use the breadcrumb to go back.",
      leadClassName: "no-print"
    });
  }

  function buildInsightsSection(report) {
    var ins = report.insights;
    if (!ins) return null;
    var sm = ins.sourceMaps;
    var conc = ins.concentration;
    var stack = el("div", { className: "insights-stack" }, []);

    stack.appendChild(el("h3", { className: "audit-subtitle", text: "Source maps vs JS/CSS deliverables" }));
    stack.appendChild(el("div", { className: "table-scroll" }, [
      table(
        ["Metric", "Value"],
        [
          [".map files (count)", String(sm.sourceMapFileCount)],
          [".map bytes (raw)", fmtBytes(sm.sourceMapRawBytes)],
          ["JS/CSS deliverable files", String(sm.deliverableJsCssFileCount)],
          ["JS/CSS deliverable bytes (raw)", fmtBytes(sm.deliverableJsCssRawBytes)],
          ["Source maps % of total raw", sm.percentOfTotalRawBytesInSourceMaps.toFixed(2) + "%"],
          ["Source maps % of all files", sm.percentOfFilesThatAreSourceMaps.toFixed(2) + "%"]
        ]
      )
    ]));

    stack.appendChild(el("h3", { className: "audit-subtitle", text: "Concentration" }));
    var concText = conc.largestFilePath
      ? "Largest file " +
        conc.largestFilePath +
        " (" +
        fmtBytes(conc.largestFileRawBytes) +
        ") is " +
        conc.largestFilePercentOfTotalRaw.toFixed(1) +
        "% of total raw size."
      : "No indexed files.";
    stack.appendChild(el("p", { className: "section-lead", text: concText }));

    var cr = ins.compressionRatios;
    var crRows = [];
    if (cr.javascript) {
      crRows.push([
        "JavaScript",
        String(cr.javascript.fileCount),
        fmtRatioPct(cr.javascript.medianGzipOverRaw),
        fmtRatioPct(cr.javascript.meanGzipOverRaw),
        fmtRatioPct(cr.javascript.medianBrotliOverRaw),
        fmtRatioPct(cr.javascript.meanBrotliOverRaw)
      ]);
    }
    if (cr.css) {
      crRows.push([
        "CSS",
        String(cr.css.fileCount),
        fmtRatioPct(cr.css.medianGzipOverRaw),
        fmtRatioPct(cr.css.meanGzipOverRaw),
        fmtRatioPct(cr.css.medianBrotliOverRaw),
        fmtRatioPct(cr.css.meanBrotliOverRaw)
      ]);
    }
    if (crRows.length) {
      stack.appendChild(el("h3", { className: "audit-subtitle", text: "Compression (gzip / brotli vs raw)" }));
      stack.appendChild(el("p", { className: "section-lead", text: "Per-file ratios by type (files with no measurement omitted for that column)." }));
      stack.appendChild(el("div", { className: "table-scroll" }, [
        table(
          ["Type", "Files", "Median gzip/raw", "Mean gzip/raw", "Median brotli/raw", "Mean brotli/raw"],
          crRows
        )
      ]));
    }

    var ef = ins.emptyFiles;
    stack.appendChild(el("h3", { className: "audit-subtitle", text: "Tiny / empty files" }));
    if (ef.count === 0) {
      stack.appendChild(el("p", { className: "summary-audit-note", text: "No files at or below " + ef.thresholdBytes + " bytes." }));
    } else {
      stack.appendChild(el("p", { className: "section-lead", text: String(ef.count) + " file(s) at or below " + ef.thresholdBytes + " bytes (possible placeholders)." }));
      if (ef.samplePaths && ef.samplePaths.length) {
        stack.appendChild(el("pre", { className: "raw insights-path-list" }, [
          document.createTextNode(ef.samplePaths.join(String.fromCharCode(10)))
        ]));
      }
    }

    if (ins.topLevelFolders && ins.topLevelFolders.length) {
      stack.appendChild(el("h3", { className: "audit-subtitle", text: "Top-level folders (raw bytes)" }));
      var tfRows = ins.topLevelFolders.map(function (r) {
        return [r.folder, String(r.fileCount), fmtBytes(r.totalRawBytes), r.percentOfTotalRawBytes.toFixed(1) + "%"];
      });
      stack.appendChild(el("div", { className: "table-scroll" }, [
        table(["Folder", "Files", "Raw", "% of total raw"], tfRows)
      ]));
    }

    if (ins.productionMaps && ins.productionMaps.triggered) {
      stack.appendChild(el("div", { className: "audit-banner warn", text: ins.productionMaps.reason }));
    }

    var nh = ins.nameHash;
    stack.appendChild(el("h3", { className: "audit-subtitle", text: "Filenames & duplicates" }));
    stack.appendChild(el("div", { className: "table-scroll" }, [
      table(
        ["Metric", "Value"],
        [
          ["Artifacts with content hash in name", String(nh.withContentHashCount)],
          ["Artifacts without hash in name", String(nh.withoutContentHashCount)],
          ["Files sharing a basename with another", String(nh.duplicateBasenameFileCount)]
        ]
      )
    ]));

    return section("Insights", stack, {
      id: "insights",
      lead: "Derived from the file index: source map footprint, dominance, compression, folder mix, and naming heuristics."
    });
  }

  function scrollToCmp(id) {
    var eln = document.getElementById(id);
    if (eln) eln.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fmtDeltaBytes(before, after) {
    var d = (after || 0) - (before || 0);
    if (d === 0) return { text: "0 B", cls: "delta-zero", hint: "" };
    var bad = d > 0;
    var sign = d > 0 ? "+" : "−";
    return {
      text: sign + fmtBytes(Math.abs(d)),
      cls: bad ? "delta-pos" : "delta-neg",
      hint: bad ? "heavier on head" : "lighter on head"
    };
  }

  function fmtDeltaInt(before, after) {
    var d = (after || 0) - (before || 0);
    if (d === 0) return { text: "0", cls: "delta-zero", hint: "" };
    var sign = d > 0 ? "+" : "";
    return { text: sign + String(d), cls: "delta-zero", hint: "" };
  }

  function deltaTd(d) {
    var symbol = "=";
    if (d.cls === "delta-pos") symbol = "▲";
    else if (d.cls === "delta-neg") symbol = "▼";
    var kids = [
      el("span", { className: "delta-symbol " + d.cls, text: symbol }),
      document.createTextNode(" " + d.text)
    ];
    if (d.hint) kids.push(el("span", { className: "delta-hint", text: d.hint }));
    return el("td", { className: "num " + d.cls }, kids);
  }

  function cmpMetricTable(rows) {
    return el("div", { className: "compare-table-wrap" }, [
      el("table", { className: "data-table compare-diff-table" }, [
        el("thead", null, [
          el("tr", null, [
            "Metric",
            "Base",
            "Head",
            "Δ (head − base)"
          ].map(function (h) {
            return el("th", { scope: "col" }, [document.createTextNode(h)]);
          }))
        ]),
        el("tbody", null, rows.map(function (r) {
          return el("tr", null, [
            el("td", { className: "metric" }, [document.createTextNode(r[0])]),
            el("td", { className: "num" }, [document.createTextNode(r[1])]),
            el("td", { className: "num" }, [document.createTextNode(r[2])]),
            deltaTd(r[3])
          ]);
        }))
      ])
    ]);
  }

  function buildTopPathsSection(base, head) {
    var mapB = {};
    (base.rankings && base.rankings.filesByRawBytes || []).slice(0, 40).forEach(function (x) {
      mapB[x.path] = x.bytes;
    });
    var mapH = {};
    (head.rankings && head.rankings.filesByRawBytes || []).slice(0, 40).forEach(function (x) {
      mapH[x.path] = x.bytes;
    });
    var paths = {};
    Object.keys(mapB).forEach(function (p) { paths[p] = 1; });
    Object.keys(mapH).forEach(function (p) { paths[p] = 1; });
    var pathList = Object.keys(paths).sort();
    var rkRows = pathList.map(function (p) {
      var vb = mapB[p];
      var vh = mapH[p];
      var bStr = vb != null ? fmtBytes(vb) : "—";
      var hStr = vh != null ? fmtBytes(vh) : "—";
      var dObj = vb != null && vh != null
        ? fmtDeltaBytes(vb, vh)
        : { text: "—", cls: "delta-zero", hint: "" };
      return [p, bStr, hStr, dObj];
    }).slice(0, 50);
    var rkTable = el("div", { className: "compare-table-wrap" }, [
      el("table", { className: "data-table compare-diff-table" }, [
        el("thead", null, [
          el("tr", null, ["Path (top raw)", "Base", "Head", "Δ"].map(function (h) {
            return el("th", { scope: "col" }, [document.createTextNode(h)]);
          }))
        ]),
        el("tbody", null, rkRows.map(function (r) {
          return el("tr", null, [
            el("td", { className: "metric" }, [document.createTextNode(r[0])]),
            el("td", { className: "num" }, [document.createTextNode(r[1])]),
            el("td", { className: "num" }, [document.createTextNode(r[2])]),
            deltaTd(r[3])
          ]);
        }))
      ])
    ]);
    return section("Top paths (raw)", rkTable, {
      id: "cmp-rankings",
      className: "compare-section-panel",
      lead: "Union of the top ~40 paths per side by raw ranking."
    });
  }

  function buildCompareReport(data, root) {
    var base = data.base;
    var head = data.head;
    var bRef = data.baseRef || "base";
    var hRef = data.headRef || "head";
    var sb = base.summary || {};
    var sh = head.summary || {};
    var mb = base.metadata || {};
    var mh = head.metadata || {};

    function branchPill(kind, label, value) {
      var txt = String(value || "—");
      return el("span", { className: "compare-branch-pill " + kind, title: label + ": " + txt }, [
        el("span", { className: "compare-branch-pill-label", text: label + ":" }),
        el("span", { className: "compare-branch-pill-value", text: txt })
      ]);
    }
    var genIso = data.generatedAt || mb.generatedAt || mh.generatedAt;
    var genAttrs = { className: "compare-generated-at", text: formatGeneratedAt(genIso) };
    if (genIso) genAttrs.datetime = genIso;
    var compareTopBar = el("div", { className: "compare-top-bar" }, [
      el("div", { className: "compare-branch-bar" }, [
        branchPill("base", "Base", bRef),
        branchPill("head", "Head", hRef)
      ]),
      el("time", genAttrs, [])
    ]);
    root.appendChild(compareTopBar);
    var rawDelta = fmtDeltaBytes(sb.totalRawBytes || 0, sh.totalRawBytes || 0);
    var gzipDelta = fmtDeltaBytes(sb.totalGzipBytes || 0, sh.totalGzipBytes || 0);
    var cards = [
      statCard("Base files", String(sb.totalFiles || 0), "Indexed on base"),
      statCard("Head files", String(sh.totalFiles || 0), "Indexed on head"),
      statCard("Δ raw (head - base)", rawDelta.text, rawDelta.hint || null),
      statCard("Δ gzip (head - base)", gzipDelta.text, gzipDelta.hint || null)
    ];
    var bb = base.build;
    var hb = head.build;
    if (bb && hb) {
      var dMs = (hb.durationMs || 0) - (bb.durationMs || 0);
      cards.push(
        statCard(
          "Δ build time",
          (dMs >= 0 ? "+" : "−") + formatDurationMs(Math.abs(dMs)),
          dMs > 0 ? "head slower build" : dMs < 0 ? "head faster build" : "same build duration"
        )
      );
    }
    root.appendChild(
      section(
        "Overview",
        el("div", { className: "summary-layout" }, [
          el("p", { className: "summary-lead", text: "Quick context to validate what was compared before reading detailed deltas." }),
          el("div", { className: "summary-stats" }, cards)
        ]),
        {
          id: "cmp-overview",
          className: "summary-panel compare-section-panel",
          lead: "Key deltas between the two indexed builds."
        }
      )
    );

    var resRows = [
      [
        "Indexed files",
        String(sb.totalFiles || 0),
        String(sh.totalFiles || 0),
        fmtDeltaInt(sb.totalFiles || 0, sh.totalFiles || 0)
      ],
      [
        "Total raw",
        fmtBytes(sb.totalRawBytes || 0),
        fmtBytes(sh.totalRawBytes || 0),
        fmtDeltaBytes(sb.totalRawBytes || 0, sh.totalRawBytes || 0)
      ],
      [
        "Total gzip",
        fmtBytes(sb.totalGzipBytes || 0),
        fmtBytes(sh.totalGzipBytes || 0),
        fmtDeltaBytes(sb.totalGzipBytes || 0, sh.totalGzipBytes || 0)
      ],
      [
        "Total brotli",
        fmtBytes(sb.totalBrotliBytes || 0),
        fmtBytes(sh.totalBrotliBytes || 0),
        fmtDeltaBytes(sb.totalBrotliBytes || 0, sh.totalBrotliBytes || 0)
      ]
    ];
    var byTypeBaseCount = (sb.byType || []).length;
    var byTypeHeadCount = (sh.byType || []).length;
    resRows.push([
      "Detected file types",
      String(byTypeBaseCount),
      String(byTypeHeadCount),
      fmtDeltaInt(byTypeBaseCount, byTypeHeadCount)
    ]);
    var tocLinks = [
      ["cmp-overview", "Overview"],
      ["cmp-summary", "Summary"],
      ["cmp-types", "By type"],
      ["cmp-percentiles", "Percentiles"]
    ];
    var ab = base.audit;
    var ah = head.audit;
    if (ab || ah) tocLinks.push(["cmp-audit", "Vulnerabilities"]);
    var ib = base.insights;
    var ih = head.insights;
    if (ib && ih) tocLinks.push(["cmp-insights", "Insights"]);
    tocLinks.push(["cmp-rankings", "Top files"]);
    root.appendChild(buildToc(tocLinks));

    if (bb && hb) {
      var dbS = (bb.durationMs || 0) / 1000;
      var dhS = (hb.durationMs || 0) / 1000;
      var dSec = dhS - dbS;
      resRows.push([
        "Build duration (s)",
        dbS.toFixed(1),
        dhS.toFixed(1),
        {
          text: (dSec >= 0 ? "+" : "") + dSec.toFixed(1) + " s",
          cls: dSec > 0 ? "delta-pos" : dSec < 0 ? "delta-neg" : "delta-zero",
          hint: ""
        }
      ]);
    }
    if (base.insights && head.insights) {
      var smBase = base.insights.sourceMaps.percentOfTotalRawBytesInSourceMaps || 0;
      var smHead = head.insights.sourceMaps.percentOfTotalRawBytesInSourceMaps || 0;
      var smDelta = smHead - smBase;
      resRows.push([
        "Source maps % of raw",
        smBase.toFixed(2) + "%",
        smHead.toFixed(2) + "%",
        {
          text: (smDelta >= 0 ? "+" : "") + smDelta.toFixed(2) + " pp",
          cls: smDelta > 0 ? "delta-pos" : smDelta < 0 ? "delta-neg" : "delta-zero",
          hint: "percentage points"
        }
      ]);
    }
    if (ab || ah) {
      var atBase = ab && ab.total != null ? ab.total : null;
      var atHead = ah && ah.total != null ? ah.total : null;
      var avDelta =
        atBase != null && atHead != null
          ? {
              text: (atHead - atBase >= 0 ? "+" : "") + String(atHead - atBase),
              cls: atHead - atBase > 0 ? "delta-pos" : atHead - atBase < 0 ? "delta-neg" : "delta-zero",
              hint: atHead - atBase < 0 ? "fewer on head" : atHead - atBase > 0 ? "more on head" : ""
            }
          : { text: "—", cls: "delta-zero", hint: "" };
      resRows.push([
        "Vulnerabilities",
        atBase == null ? "—" : String(atBase),
        atHead == null ? "—" : String(atHead),
        avDelta
      ]);
    }
    if (base.insights && head.insights) {
      var hbBase = base.insights.nameHash.withContentHashCount || 0;
      var hbHead = head.insights.nameHash.withContentHashCount || 0;
      resRows.push([
        "Files with content hash",
        String(hbBase),
        String(hbHead),
        fmtDeltaInt(hbBase, hbHead)
      ]);
    }
    root.appendChild(section("Summary", cmpMetricTable(resRows), {
      id: "cmp-summary",
      className: "compare-section-panel",
      lead: "Executive comparison across size, composition, build, audit, and key derived indicators."
    }));

    var byB = {};
    (sb.byType || []).forEach(function (r) { byB[r.type] = r; });
    var byH = {};
    (sh.byType || []).forEach(function (r) { byH[r.type] = r; });
    var types = Object.keys(byB);
    Object.keys(byH).forEach(function (k) { if (types.indexOf(k) === -1) types.push(k); });
    types.sort();
    var typeRows = types.map(function (t) {
      var x = byB[t] || { count: 0, totalRawBytes: 0, totalGzipBytes: 0, totalBrotliBytes: 0 };
      var y = byH[t] || { count: 0, totalRawBytes: 0, totalGzipBytes: 0, totalBrotliBytes: 0 };
      return [
        String(t),
        String(x.count),
        String(y.count),
        fmtDeltaInt(x.count, y.count),
        fmtBytes(x.totalRawBytes || 0),
        fmtBytes(y.totalRawBytes || 0),
        fmtDeltaBytes(x.totalRawBytes || 0, y.totalRawBytes || 0)
      ];
    });
    var typeHead = ["Type", "N (base)", "N (head)", "ΔN", "Raw base", "Raw head", "Δ raw"];
    var typeTable = el("div", { className: "compare-table-wrap" }, [
      el("table", { className: "data-table compare-diff-table" }, [
        el("thead", null, [
          el("tr", null, typeHead.map(function (h) {
            return el("th", { scope: "col" }, [document.createTextNode(h)]);
          }))
        ]),
        el("tbody", null, typeRows.map(function (r) {
          return el("tr", null, [
            el("td", { className: "metric" }, [document.createTextNode(r[0])]),
            el("td", { className: "num" }, [document.createTextNode(r[1])]),
            el("td", { className: "num" }, [document.createTextNode(r[2])]),
            deltaTd(r[3]),
            el("td", { className: "num" }, [document.createTextNode(r[4])]),
            el("td", { className: "num" }, [document.createTextNode(r[5])]),
            deltaTd(r[6])
          ]);
        }))
      ])
    ]);
    root.appendChild(section("By file type", typeTable, {
      id: "cmp-types",
      className: "compare-section-panel",
      lead: "Counts and raw bytes per category."
    }));

    var pb = base.percentiles || {};
    var ph = head.percentiles || {};
    var pk = ${DISTRIBUTION_KEYS_JSON}.filter(function (k) {
      return pb[k] || ph[k];
    });
    var pcRows = pk.map(function (k) {
      var a = pb[k] || {};
      var c = ph[k] || {};
      return [
        distLabel(k),
        fmtBytes(a.p50 || 0),
        fmtBytes(c.p50 || 0),
        fmtDeltaBytes(a.p50 || 0, c.p50 || 0),
        fmtBytes(a.p90 || 0),
        fmtBytes(c.p90 || 0),
        fmtDeltaBytes(a.p90 || 0, c.p90 || 0),
        fmtBytes(a.p99 || 0),
        fmtBytes(c.p99 || 0),
        fmtDeltaBytes(a.p99 || 0, c.p99 || 0)
      ];
    });
    var pcHead = ["Group", "p50 B", "p50 H", "Δ", "p90 B", "p90 H", "Δ", "p99 B", "p99 H", "Δ"];
    var pcTable = el("div", { className: "compare-table-wrap" }, [
      el("table", { className: "data-table compare-diff-table" }, [
        el("thead", null, [
          el("tr", null, pcHead.map(function (h) {
            return el("th", { scope: "col" }, [document.createTextNode(h)]);
          }))
        ]),
        el("tbody", null, pcRows.map(function (r) {
          return el("tr", null, [
            el("td", { className: "metric" }, [document.createTextNode(r[0])]),
            el("td", { className: "num" }, [document.createTextNode(r[1])]),
            el("td", { className: "num" }, [document.createTextNode(r[2])]),
            deltaTd(r[3]),
            el("td", { className: "num" }, [document.createTextNode(r[4])]),
            el("td", { className: "num" }, [document.createTextNode(r[5])]),
            deltaTd(r[6]),
            el("td", { className: "num" }, [document.createTextNode(r[7])]),
            el("td", { className: "num" }, [document.createTextNode(r[8])]),
            deltaTd(r[9])
          ]);
        }))
      ])
    ]);
    root.appendChild(section("Percentiles (raw)", pcTable, {
      id: "cmp-percentiles",
      className: "compare-section-panel",
      lead: "Percentiles by group: B = base, H = head."
    }));

    if (ab || ah) {
      var auditWrap = el("div", { className: "compare-audit-wrap" }, []);
      if (ab) auditWrap.appendChild(buildAuditCompareSide(ab, "Base (" + (bRef || "base") + ")"));
      if (ah) auditWrap.appendChild(buildAuditCompareSide(ah, "Head (" + (hRef || "head") + ")"));
      root.appendChild(section("Vulnerabilities", auditWrap, {
        id: "cmp-audit",
        className: "compare-section-panel",
        lead: "Same layout as the single-report view per side: totals, severity counts, and direct vs transitive listings when CVE rows are present."
      }));
    }

    if (ib && ih) {
      var dSm =
        ih.sourceMaps.percentOfTotalRawBytesInSourceMaps -
        ib.sourceMaps.percentOfTotalRawBytesInSourceMaps;
      var insRows = [
        [
          "Source maps % raw",
          ib.sourceMaps.percentOfTotalRawBytesInSourceMaps.toFixed(2) + "%",
          ih.sourceMaps.percentOfTotalRawBytesInSourceMaps.toFixed(2) + "%",
          {
            text: (dSm >= 0 ? "+" : "") + dSm.toFixed(2) + " pp",
            cls: dSm > 0 ? "delta-pos" : dSm < 0 ? "delta-neg" : "delta-zero",
            hint: "percentage points"
          }
        ],
        (function () {
          var dLc =
            ih.concentration.largestFilePercentOfTotalRaw -
            ib.concentration.largestFilePercentOfTotalRaw;
          return [
            "Largest file % of total",
            ib.concentration.largestFilePercentOfTotalRaw.toFixed(1) + "%",
            ih.concentration.largestFilePercentOfTotalRaw.toFixed(1) + "%",
            {
              text: (dLc >= 0 ? "+" : "") + dLc.toFixed(1) + " pp",
              cls: dLc > 0 ? "delta-pos" : dLc < 0 ? "delta-neg" : "delta-zero",
              hint: ""
            }
          ];
        })(),
        [
          "Files with content hash in name",
          String(ib.nameHash.withContentHashCount),
          String(ih.nameHash.withContentHashCount),
          fmtDeltaInt(ib.nameHash.withContentHashCount, ih.nameHash.withContentHashCount)
        ]
      ];
      root.appendChild(section("Insights (excerpt)", cmpMetricTable(insRows), {
        id: "cmp-insights",
        className: "compare-section-panel",
        lead: "Derived indicators; open each side's JSON for full detail."
      }));
    }
    root.appendChild(buildTopPathsSection(base, head));
  }

  var node = document.getElementById("bundlelens-report");
  if (!node) return;
  var report = JSON.parse(node.textContent || "{}");
  var root = document.getElementById("root");
  if (!root) return;

  var view =
    (document.documentElement && document.documentElement.getAttribute("data-bundlelens-view")) ||
    "index";

  if (report._bundlelensCompare) {
    buildCompareReport(report, root);
    return;
  }

  if (view === "files") {
    var onlyFiles = buildFullFilesSection(report);
    if (onlyFiles) {
      root.appendChild(onlyFiles);
    } else {
      root.appendChild(el("p", { className: "section-lead", text: "No files are available in this report." }));
    }
    return;
  }

  if (view === "treemap") {
    if (report.files && report.files.length) {
      root.appendChild(buildTreemapSection(report));
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

  var tocLinks = [["overview", "Overview"]];
  if (report.insights) tocLinks.push(["insights", "Insights"]);
  if (build) tocLinks.push(["build", "Build"]);
  if (sum.byType && sum.byType.length) tocLinks.push(["composition", "Composition"]);
  if (report.audit) tocLinks.push(["vulnerabilities", "Vulnerabilities"]);
  if (report.files && report.files.length) {
    tocLinks.push(["files", "Files"]);
    tocLinks.push(["treemap", "Treemap"]);
  }
  tocLinks.push(["rankings", "Rankings"]);
  var dist = report.distributions || {};
  if (Object.keys(dist).length) tocLinks.push(["distributions", "Distributions"]);
  var pc = report.percentiles || {};
  if (Object.keys(pc).length) tocLinks.push(["percentiles", "Percentiles"]);
  var sm = (report.files || []).filter(function (f) { return f.isSourceMap || f.type === "sourcemap"; });
  if (sm.length) tocLinks.push(["sourcemaps", "Source maps"]);
  if (report.thresholds && report.thresholds.length) tocLinks.push(["thresholds", "Thresholds"]);
  tocLinks.push(["json", "Raw JSON"]);
  root.appendChild(buildToc(tocLinks));

  var genIso = m.generatedAt || "";
  var genBarKids = [
    el("span", { className: "report-generated-label", text: "Generated " }),
    el("time", { className: "report-generated-time", datetime: genIso, text: formatGeneratedAt(genIso) })
  ];
  var modeStr = m.mode || "";
  var metaLineParts = [
    "BundleLens " + (m.bundlelensVersion || "—"),
    modeLabel(modeStr)
  ];
  if (typeof m.analysisDurationMs === "number") {
    metaLineParts.push("Analysis " + formatDurationMs(m.analysisDurationMs));
  }
  genBarKids.push(el("span", { className: "report-generated-meta", text: " · " + metaLineParts.join(" · ") }));
  root.appendChild(el("div", { className: "report-generated-bar" }, genBarKids));

  root.appendChild(section("Overview", buildSummaryBody(m, sum, report.audit), {
    id: "overview",
    className: "summary-panel",
    lead: "Aggregated metrics, paths, and dependency audit (when available)."
  }));

  var insightsSection = buildInsightsSection(report);
  if (insightsSection) {
    root.appendChild(insightsSection);
  }

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
      id: "composition",
      lead: "How total size is distributed across file types in the output directory."
    }));
  }

  if (report.audit) {
    var a = report.audit;
    var aw = el("div", null, []);
    aw.appendChild(buildVulnerabilitiesSectionBody(a));
    root.appendChild(section("Vulnerabilities", aw, {
      id: "vulnerabilities",
      lead: "Dependency risk summary from vulnerability scanning, when available."
    }));
  }

  if (report.files && report.files.length) {
    root.appendChild(buildFilesStubSection(report.files.length));
    root.appendChild(buildTreemapStubSection(report.files.length));
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
      id: "distributions",
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

  if (report.thresholds && report.thresholds.length) {
    var thWrap = el("div", { className: "table-scroll" }, [thresholdsTable(report.thresholds)]);
    root.appendChild(section("Thresholds", thWrap, {
      id: "thresholds",
      lead: "Comparison against limits configured for this analysis."
    }));
  }

  var jsonPre = el("pre", { className: "raw" }, []);
  var jsonBlock = el("details", { className: "json-details" }, [
    el("summary", { className: "json-summary", text: "Show full report JSON (preview)" }),
    jsonPre
  ]);
  jsonBlock.addEventListener("toggle", function () {
    if (!jsonBlock.open || jsonPre.getAttribute("data-populated") === "1") return;
    jsonPre.textContent = JSON.stringify(report, null, 2);
    jsonPre.setAttribute("data-populated", "1");
  });
  root.appendChild(section("Raw JSON data", jsonBlock, {
    id: "json",
    className: "no-print",
    lead: "Use Download JSON in the header for the full file. Expand below for an in-page preview only."
  }));
})();
`;
