# Contributing

Thanks for helping improve **bundlelens**.

## Development setup

```bash
git clone https://github.com/alejandrorodrom/bundlelens.git
cd bundlelens
npm ci
npm run build
```

Requirements: Node.js `>= 18`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | `tsc --watch` for development |
| `npm run lint` | ESLint with zero warnings allowed |
| `npm run lint:fix` | ESLint with auto-fix |

CI runs `npm run lint` and `npm run build` on pull requests.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused (one concern per PR when possible).
3. Run `npm run lint` and `npm run build` before opening the PR.
4. Update the root [README](README.md) when user-facing behavior or docs change.
5. Smoke-test the CLI locally when relevant, for example:

```bash
node ./dist/cli/index.js --help
node ./dist/cli/index.js run
```

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) when opening a PR.

## Reporting bugs / ideas

- Bugs and features: [GitHub Issues](https://github.com/alejandrorodrom/bundlelens/issues)
- Security vulnerabilities: see [SECURITY.md](SECURITY.md) (do not open a public issue with exploit details)

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
