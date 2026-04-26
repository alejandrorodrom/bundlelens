# BundleLens

[![npm version](https://img.shields.io/npm/v/bundlelens.svg)](https://www.npmjs.com/package/bundlelens) [![npm downloads](https://img.shields.io/npm/dm/bundlelens.svg)](https://www.npmjs.com/package/bundlelens) [![minified](https://img.shields.io/bundlephobia/min/bundlelens?label=minified&style=flat)](https://bundlephobia.com/package/bundlelens) [![minified + gzip](https://img.shields.io/bundlephobia/minzip/bundlelens?label=minified%20%2B%20gzip&style=flat)](https://bundlephobia.com/package/bundlelens) [![install size](https://packagephobia.com/badge?p=bundlelens)](https://packagephobia.com/result?p=bundlelens) [![License: MIT](https://img.shields.io/npm/l/bundlelens.svg)](https://github.com/alejandrorodrom/bundlelens/blob/main/LICENSE) [![GitHub stars](https://img.shields.io/github/stars/alejandrorodrom/bundlelens.svg)](https://github.com/alejandrorodrom/bundlelens/stargazers) [![CI](https://github.com/alejandrorodrom/bundlelens/actions/workflows/ci.yml/badge.svg)](https://github.com/alejandrorodrom/bundlelens/actions/workflows/ci.yml) [![npm audit](https://github.com/alejandrorodrom/bundlelens/actions/workflows/npm-audit.yml/badge.svg)](https://github.com/alejandrorodrom/bundlelens/actions/workflows/npm-audit.yml) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Framework-agnostic **command-line tool**: runs your build (or analyzes an existing folder), measures artifact sizes (raw, gzip, brotli), classifies files, generates rankings, and outputs an HTML/JSON report. It can optionally integrate **dependency auditing** based on your package manager (npm, pnpm, Yarn, Bun) and allows you to **compare two Git branches** in isolated environments (worktrees).

---

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Getting started (5 minutes)](#getting-started-5-minutes)
4. [Practical examples by stack](#practical-examples-by-stack)
5. [CLI Commands](#cli-commands)
   - [`bundlelens init`](#bundlelens-init)
   - [`bundlelens run`](#bundlelens-run)
   - [`bundlelens analyze`](#bundlelens-analyze)
   - [`bundlelens compare`](#bundlelens-compare)
6. [Configuration file](#configuration-file-bundlelensconfigjson)
7. [Outputs and reports](#outputs-and-reports)
8. [Precedence: file vs flags](#precedence-file-vs-flags)
9. [CI/CD usage](#cicd-usage)
10. [Comparing branches with Git](#comparing-branches-with-git)
11. [Troubleshooting](#troubleshooting)
12. [Development and npm publishing](#development-and-npm-publishing)
13. [License](#license)

---

## Requirements

| Requirement | Detail |
|-------------|--------|
| **Node.js** | **18 or higher** (`engines` in `package.json`) |
| **Git** | Required only for the **`compare`** command |
| **Network** | Needed if you enable **`audit: true`** (queries package registry) |

---

## Installation

Choose **one** of these methods depending on your workflow.

### Option A: `npx` (no global install)

Ideal for trying it out or for one-off CI scripts:

```bash
npx bundlelens@latest --help
```

The first run downloads the package; later runs may use npm cache.

### Option B: Project dependency (`devDependencies`)

Recommended for teams and reproducible pipelines:

```bash
npm install --save-dev bundlelens
```

Then invoke the binary with `npx` or from `package.json`:

```json
{
  "scripts": {
    "bundlelens": "bundlelens run",
    "bundlelens:analyze": "bundlelens analyze"
  }
}
```

```bash
npm run bundlelens
```

### Option C: Global installation

```bash
npm install -g bundlelens
bundlelens --help
```

### Option D: Clone the repository and build

If you contribute to the source code:

```bash
git clone <repo-url>
cd bundlelens
npm install
npm run build
node ./dist/cli/index.js --help
```

To use the `bundlelens` command from the local tree without publishing:

```bash
npm link
# or
npx bundlelens --help   # after npm pack / npm install ./path
```

---

## Getting started (5 minutes)

### Step 1: Generate configuration

In your project root (where `package.json` is):

```bash
npx bundlelens init
```

This creates **`bundlelens.config.json`** with default values and, if **`.gitignore`** exists, adds an entry for the report folder (default `bundlelens/`), unless you use `--skip-gitignore`.

### Step 2: Adjust `buildDir` and `buildCommand`

Open `bundlelens.config.json` and check:

- **`buildCommand`**: the same command you would use in terminal to produce the build (e.g. `npm run build`, `pnpm run build`).
- **`buildDir`**: folder **relative to the config file** where artifacts are generated (e.g. `dist`, `build`, `.next/out` depending on your stack).

### Step 3: Run a full analysis

```bash
npx bundlelens run
```

If you did not set `buildCommand` in the file, the tool can ask for it interactively (requires a TTY terminal).

### Step 4: Open the report

After a successful `run` or `analyze`, open in your browser:

- **`./bundlelens/index.html`** (path relative to your project; folder name depends on `outputDir` in config).

---

## Practical examples by stack

The examples below assume you are in the project root and already installed `bundlelens` (`npx` or devDependency).

### JavaScript project (vanilla / Vite / webpack)

Typical case where artifacts are generated in `dist/`.

**`bundlelens.config.json`**

```json
{
  "buildCommand": "npm run build",
  "buildDir": "dist",
  "outputDir": "bundlelens",
  "audit": true
}
```

**Run**

```bash
npx bundlelens run
```

---

### Angular project

Angular CLI usually outputs to `dist/<project-name>/browser` (Angular 17+) or `dist/<project-name>`.

**`bundlelens.config.json`**

```json
{
  "buildCommand": "npm run build",
  "buildDir": "dist/my-angular-app/browser",
  "outputDir": "bundlelens",
  "audit": true
}
```

If your output path is different, replace `buildDir` with the value configured in your `angular.json`.

**Run**

```bash
npx bundlelens run
```

---

### Ionic project

Ionic builds for web commonly output to `www/`.

**`bundlelens.config.json`**

```json
{
  "buildCommand": "npm run build",
  "buildDir": "www",
  "outputDir": "bundlelens",
  "audit": true
}
```

**Run**

```bash
npx bundlelens run
```

---

### React project

For Create React App, output is typically `build/`. For Vite-based React, it is usually `dist/`.

**`bundlelens.config.json`** (CRA example)

```json
{
  "buildCommand": "npm run build",
  "buildDir": "build",
  "outputDir": "bundlelens",
  "audit": true
}
```

**Run**

```bash
npx bundlelens run
```

For Vite React, switch only:

```json
{
  "buildDir": "dist"
}
```

---

### Next.js project

If you use static export, the output folder is usually `out/`.

**`bundlelens.config.json`** (static export)

```json
{
  "buildCommand": "npm run build",
  "buildDir": "out",
  "outputDir": "bundlelens",
  "audit": true
}
```

**Run**

```bash
npx bundlelens run
```

If you want to analyze `.next` artifacts instead of export output:

```bash
npx bundlelens analyze .next --output bundlelens --no-audit
```

---

### Same practical examples, using flags only (no config file)

Use these when you do not want to create `bundlelens.config.json`.

**JavaScript (Vite/webpack generic):**

```bash
npx bundlelens run "npm run build" --build-dir dist --output bundlelens --audit
```

**Angular:**

```bash
npx bundlelens run "npm run build" --build-dir dist/my-angular-app/browser --output bundlelens --audit
```

**Ionic:**

```bash
npx bundlelens run "npm run build" --build-dir www --output bundlelens --audit
```

**React (CRA):**

```bash
npx bundlelens run "npm run build" --build-dir build --output bundlelens --audit
```

**React (Vite):**

```bash
npx bundlelens run "npm run build" --build-dir dist --output bundlelens --audit
```

**Next.js (static export):**

```bash
npx bundlelens run "npm run build" --build-dir out --output bundlelens --audit
```

**Next.js (`.next` analysis only):**

```bash
npx bundlelens analyze .next --output bundlelens --no-audit
```

Tip: if your CI job should fail when build fails, add `--fail-on-build` to the `run` commands.

---

### Quick compare example (any stack)

Compare `main` vs your feature branch and get a side-by-side report:

```bash
npx bundlelens compare --base main --head feature/my-change
```

Open:

- `bundlelens/compare/compare.html`

---

## CLI Commands

General invocation:

```bash
bundlelens <command> [arguments] [options]
```

If you run **`bundlelens`** with no arguments, help is shown and the process exits with a non-zero code (so scripts fail explicitly).

---

### `bundlelens init`

Creates **`bundlelens.config.json`** in the current directory and optionally updates **`.gitignore`**.

| Option | Description |
|--------|-------------|
| `--force` | Overwrites `bundlelens.config.json` if it already exists. |
| `--skip-gitignore` | Does not modify `.gitignore`. |
| `--output <dir>` | Writes the **`outputDir`** value in config (JSON default: `bundlelens`). |

**Examples:**

```bash
bundlelens init
bundlelens init --output reports/bundlelens
bundlelens init --force --skip-gitignore
```

---

### `bundlelens run`

1. Optionally adjusts **`.npmrc`** if lockfile consistency is needed (same logic as `compare`).
2. If **`node_modules`** is missing but `package.json` exists, it can run or ask for an install command (depending on config and TTY).
3. Runs the **build command** in the project directory.
4. Analyzes **`buildDir`** and writes reports to **`outputDir`**.

| Argument / option | Description |
|-------------------|-------------|
| `[buildCommand]` | Build command (positional). If omitted and not present in config, can be requested interactively. |
| `--build-dir <dir>` | Build output folder to analyze. |
| `--output <dir>` | Folder to write reports (default `./bundlelens` if not configured). |
| `--config <file>` | Path to a configuration JSON different from default. |
| `--audit` | Forces dependency audit even if config has `audit: false`. |
| `--no-audit` | Skips audit even if config has `audit: true`. |
| `--fail-on-build` | If build exits with code != 0, Node process inherits that exit code (subject to flags vs config policy). |
| `--no-fail-on-build` | Do not propagate build error code even if `failOnBuild` is `true` in config. |

**Examples:**

```bash
bundlelens run
bundlelens run "npm run build"
bundlelens run --build-dir dist --no-audit
bundlelens run --config ./config/bundlelens.config.json
```

---

### `bundlelens analyze`

Analyzes an **already generated** build folder (does not run the build command).

| Argument / option | Description |
|-------------------|-------------|
| `[buildDir]` | Build path (positional). Practically equivalent to `--build-dir`. |
| `--build-dir <dir>` | Same as positional; useful in scripts. |
| `--output <dir>` | Report folder. |
| `--config <file>` | Configuration file. |
| `--audit` / `--no-audit` | Same behavior as `run`. |

**Examples:**

```bash
bundlelens analyze dist
bundlelens analyze --build-dir .next
```

---

### `bundlelens compare`

Builds and analyzes **two Git refs** (branches, tags, or commits) using temporary **worktrees**, then generates a comparison report.

**Requirements:** inside a Git repository; base and head must be different refs.

| Option | Description |
|--------|-------------|
| `--base <ref>` | "Base" ref (reference). |
| `--head <ref>` | "Changes" ref / comparison target. |
| `--build-command <cmd>` | Build command override (per side; merged like in `run`). |
| `--build-dir <dir>` | Build folder override. |
| `--install-command <cmd>` | Install command when `node_modules` is missing (after config-defined command). |
| `--output <dir>` | Report root; compare output is written to **`<output>/compare/`** (after merging with config `outputDir`). |
| `--config <file>` | Configuration file. |
| `--audit` / `--no-audit` | Explicit audit control. |
| `--fail-on-build` / `--no-fail-on-build` | Propagate build failures on one or both sides. |

If you do not pass `--base` / `--head`, you can define **`compare.baseBranch`** and **`compare.headBranch`** in config, or choose refs interactively when TTY is available.

**Example:**

```bash
bundlelens compare --base main --head feature/metrics
```

---

## Configuration file (`bundlelens.config.json`)

The default file is named **`bundlelens.config.json`** in the project root. You can validate it and get IDE autocomplete by pointing **`$schema`** to the schema included in the package:

```json
{
  "$schema": "./node_modules/bundlelens/bundlelens.schema.json",
  "buildCommand": "npm run build",
  "buildDir": "dist",
  "outputDir": "bundlelens",
  "audit": true,
  "failOnBuild": false,
  "compression": {
    "gzip": true,
    "brotli": true
  },
  "thresholds": {
    "enabled": false,
    "categories": {}
  },
  "compare": {
    "baseBranch": "main",
    "headBranch": "develop"
  },
  "install": {
    "command": "npm ci"
  }
}
```

### Property summary

| Property | Type | Description |
|----------|------|-------------|
| **`$schema`** | string | JSON Schema URI (recommended for IDE support). |
| **`buildCommand`** | string | Shell command for `bundlelens run`. |
| **`buildDir`** | string | Build output directory. **Relative paths** are resolved from **the config file location**. |
| **`outputDir`** | string | Report output folder (relative to project **cwd** when running CLI). |
| **`audit`** | boolean | If `true`, runs package-manager audit detected by lockfile. Tool behavior usually treats this as `true` unless specified otherwise in file/flags. |
| **`failOnBuild`** | boolean | If `true`, propagates build exit code on failure. |
| **`compression`** | object | `gzip` and `brotli`: compute compressed sizes per file during indexing. |
| **`thresholds`** | object | `enabled` and `categories` with limits by file type (`maxFileRawBytes`, `maxFileGzipBytes`, `maxTotalRawBytes`, `maxTotalGzipBytes`). |
| **`compare`** | object | Default `baseBranch` and `headBranch` for `bundlelens compare`. |
| **`install`** | object | `command`: non-interactive install when `node_modules` is missing (useful in CI). |

The exact list of keys and types is in **`bundlelens.schema.json`** in the published package.

---

## Outputs and reports

After **`run`** or **`analyze`**, in **`outputDir`** (e.g. `./bundlelens/`) you will typically find:

| File / folder | Content |
|---------------|---------|
| **`index.html`** | Main report (metrics and links to other views). |
| **`rankings.html`** | Size rankings. |
| **`files.html`** | Per-file detail (only if files were indexed). |
| **`report.json`** | Same information as JSON (useful for pipelines). |
| **Static assets** | Shared CSS/JS generated next to HTML. |

After **`compare`**, under **`<outputDir>/compare/`** (`outputDir` is the **resolved** config value + `compare` folder):

| File | Content |
|------|---------|
| **`compare.html`** | Base vs head comparison view. |
| **`compare-report.json`** | Compare JSON payload. |

At the end, CLI prints useful absolute or relative paths so you can open or archive these files.

---

## Precedence: file vs flags

Current merge behavior (important for CI and scripts):

1. It looks up and reads **`bundlelens.config.json`** (or path from **`--config`**).
2. **`buildCommand`**: if file has `buildCommand`, **that value wins**; otherwise CLI value is used (positional in `run` or equivalent options in `compare`). Same `??` idea: file first, CLI fallback.
3. **`outputDir`**: if file defines **`outputDir`**, it **wins** over `--output`; if file does not define it, then flag is used and finally default (`bundlelens`).
4. **`buildDir`**: if file defines **`buildDir`**, it **wins** over `--build-dir`; if only CLI provides it, relative path resolves against **config file directory** when config exists on disk, otherwise against project **cwd**.
5. **`audit` and `failOnBuild`**: if key **exists in JSON** (either `true` or `false`), **file wins** and flags **`--audit` / `--no-audit`** and **`--fail-on-build` / `--no-fail-on-build`** apply only when key is **not** defined in file.

If you need CLI to always override (for example `--no-audit` in CI) and your JSON sets `audit: true`, you must **remove or omit** the `audit` key from JSON, or generate config without that property.

---

## CI/CD usage

### Principles

- **No TTY:** there are no interactive prompts. You should provide **`buildCommand`**, **`buildDir`**, and, when needed, **`install.command`** in config or flags.
- **`analyze`** is ideal when another job already ran the build and you only want to measure artifacts.
- **`--no-audit`** speeds up execution and avoids network dependency if you do not need vulnerability reporting in that job.

### Minimal example (GitHub Actions)

```yaml
name: BundleLens
on: [push, pull_request]
jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npx bundlelens@latest analyze dist --output bundlelens --no-audit
      - uses: actions/upload-artifact@v4
        with:
          name: bundlelens-report
          path: bundlelens/
```

Replace `dist` with your actual `buildDir` (`build`, `out`, etc.).

---

## Comparing branches with Git

`bundlelens compare`:

1. Creates Git **worktrees** in a temporary directory.
2. In each worktree it can install dependencies and run the build.
3. Writes the report under **`.../compare/`**.

**Best practices:**

- Make sure **`buildDir`** and **`buildCommand`** are valid in **both** refs (or pass flags).
- If **`bundlelens.config.json`** is not tracked in Git, the code attempts to **reuse** config from your main working tree so `buildCommand` / `buildDir` are not lost in the worktree.

---

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| **0 files indexed** | Wrong `buildDir`, empty folder, or read permissions (on macOS you may need "Full Disk Access" for your terminal app). |
| **`compare` failure** | Are you in a Git repo? Are `base` and `head` different? Do you have network if using `audit`? |
| **Empty audit or audit error** | Connectivity, correct lockfile, package manager installed (`pnpm`, `yarn`, etc.). |
| **Config not found** | `--config` path or cwd where you launch command. |
| **`ENOENT` in buildDir** | Build did not generate output or path is relative to wrong base (config location vs cwd). |

For quick debugging: open **`report.json`** or **`compare-report.json`** and inspect `metadata.analysisNotices` when present.

---

## Development and npm publishing

For package **maintainers**.

### Repository scripts

| Script | Action |
|--------|--------|
| `npm run build` | Compiles TypeScript to **`dist/`** (`tsc`). |
| `npm run dev` | `tsc --watch` for development. |
| `prepublishOnly` | Before publishing, npm runs **`npm run build`** automatically. |

### Published content (`files` in `package.json`)

- **`dist/`** (compiled code).
- **`bundlelens.schema.json`** (schema for editors and documentation).

### Checklist before `npm publish`

1. Version updated in **`package.json`** (`npm version patch|minor|major`).
2. **`npm run build`** runs without errors.
3. Test binary locally: `node dist/cli/index.js run` in a sample project.
4. Log in to npm: `npm login`.
5. Publish: `npm publish` (add `--access public` if scope requires it).

End users usually consume the already compiled package; TypeScript is **not** required in their projects to use the CLI.

---

## License

**MIT** - see the repository `LICENSE` file if present, or the `license` field in `package.json`.

---

## Useful links

- **Repository (code and issues):** [github.com/alejandrorodrom/bundlelens](https://github.com/alejandrorodrom/bundlelens)
- **Author (LinkedIn):** [Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/)
- **Config JSON Schema:** `bundlelens.schema.json` (in installed package root or repo root).
- **Terminal help:** `bundlelens --help`, `bundlelens run --help`, etc.

If anything in this README does not match your installed version, check version with:

```bash
bundlelens --version
```
