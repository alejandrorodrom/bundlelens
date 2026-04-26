/**
 * @param err - Any thrown or caught value.
 * @returns Node `errno` string when present, otherwise `undefined`.
 */
export function nodeErrnoCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as NodeJS.ErrnoException).code;
    if (typeof c === "string" && c.length > 0) {
      return c;
    }
  }
  return undefined;
}
