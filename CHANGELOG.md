# Changelog

All notable changes to **BundleLens** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-26

First stable public release: full CLI, HTML/JSON reports, Git ref comparison, and optional dependency auditing.

### Added

- **CLI** (`bundlelens`) for Node.js **≥ 18**, shipped as an ESM package (`type: "module"`).
- **`init` command**: creates `bundlelens.config.json`, optional `.gitignore` update, `--force`, `--skip-gitignore`, `--output` to set `outputDir`.
- **`run` command**: runs the build, analyzes `buildDir`, writes reports to `outputDir`; flags `--build-dir`, `--output`, `--config`, `--audit` / `--no-audit`, `--fail-on-build` / `--no-fail-on-build`; build progress spinner.
- **`analyze` command**: analyzes an existing artifact folder (no build); same output and audit options as `run`.
- **`compare` command**: compares two Git refs (branches, tags, or commits) using temporary **worktrees**; report under `<outputDir>/compare/` (`compare.html`, `compare-report.json`); options `--base`, `--head`, `--build-command`, `--build-dir`, `--install-command`, `--output`, `--config`, audit toggles, and build failure propagation.
- **`bundlelens.config.json`** with documented precedence over flags (`buildCommand`, `outputDir`, `buildDir`, `audit`, `failOnBuild`).
- **`bundlelens.schema.json`**: JSON Schema for validation and editor autocomplete (`$schema`).
- **Per-file metrics**: raw and compressed sizes (**gzip** and **brotli** optional via `compression` in config).
- **File classification** and category analysis (JavaScript, CSS, images, fonts, source maps, HTML, JSON, WASM, etc.).
- **Rankings**, **distribution**, **percentiles**, **thresholds** (`thresholds.enabled` and per-category limits), and **insights** in the analysis pipeline.
- Optional **dependency auditing** based on lockfile-detected package manager (**npm**, **pnpm**, **Yarn**, **Bun**).
- **`.npmrc`** adjustment for lockfile consistency where applicable (e.g. `compare` / `run` flows).
- Non-interactive install when **`node_modules`** is missing (`install.command` in config or TTY prompts).
- **HTML reports**: `index.html`, `rankings.html`, `files.html` (when files are indexed), embedded static assets (CSS/JS).
- **`report.json`**: machine-readable output for CI and automation.
- **Terminal** summary with useful paths, human-readable duration, and TTY / non-TTY behavior.
- Utilities: path resolution relative to config, existence checks, Node `errno` helpers, byte formatting, compression helpers, MIME/extension typing, project dependencies, CLI version.
- **MIT License**, **English README** with stack guides (Vite, Angular, Ionic, React, CRA, Next.js static export, `.next`), CI/CD, troubleshooting, and npm/repo links.
- Project logo at **`docs/bundlelens-logo.png`** included in the published package.
- **GitHub Actions**: CI (`ci.yml`), npm audit (`npm-audit.yml`), publish (`publish.yml`).
- **ESLint** (flat config), **Husky** + **lint-staged** on pre-commit for TypeScript quality.

### Notes

- With no arguments, the CLI prints help and exits non-zero so scripts fail explicitly.
- `compare` requires a Git repository; `base` and `head` must be different refs.

[1.0.0]: https://github.com/alejandrorodrom/bundlelens
