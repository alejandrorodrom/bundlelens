/**
 * Parses `--audit` / `--no-audit` from `process.argv`-style input.
 *
 * @param argv - Typically `process.argv`.
 * @returns `true`/`false` when a flag is present; otherwise `undefined` (use config default).
 */
export function auditFromArgv(argv: string[]): boolean | undefined {
  if (argv.includes("--no-audit")) return false;
  if (argv.includes("--audit")) return true;
  return undefined;
}

/**
 * Parses `--fail-on-build` / `--no-fail-on-build` from argv-style input.
 *
 * @param argv - Typically `process.argv`.
 * @returns `true`/`false` when a flag is present; otherwise `undefined`.
 */
export function failOnBuildFromArgv(argv: string[]): boolean | undefined {
  if (argv.includes("--no-fail-on-build")) return false;
  if (argv.includes("--fail-on-build")) return true;
  return undefined;
}
