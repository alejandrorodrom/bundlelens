# Security Policy

## Supported versions

Security fixes are applied to the latest published release on npm (`bundlelens`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. [GitHub Security Advisories](https://github.com/alejandrorodrom/bundlelens/security/advisories/new) (private report), or
2. Contact the maintainer via [GitHub Sponsors / profile](https://github.com/alejandrorodrom) if advisories are unavailable.

Include:

- Affected package version
- Steps to reproduce
- Impact assessment (if known)

You should receive an acknowledgement when possible. Please give reasonable time for a fix before public disclosure.

## Scope

This tool analyzes local build artifacts and may run your project's build command and optional dependency audits. Treat untrusted repositories and configs carefully before running BundleLens against them.
