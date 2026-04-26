import { brotliCompressSync, gzipSync } from "node:zlib";
import type { ResolvedCompression } from "../types/config.js";

/** Optional gzip/brotli sizes when the corresponding algorithm is enabled. */
export type CompressedSizes = {
  gzipBytes: number | null;
  brotliBytes: number | null;
};

/**
 * Computes gzip and/or brotli compressed lengths for a buffer.
 *
 * @param buffer - Raw file bytes.
 * @param options - Which algorithms to run (failures become `null` fields).
 * @returns Lengths per enabled algorithm.
 */
export function measureCompression(
  buffer: Buffer,
  options: ResolvedCompression
): CompressedSizes {
  let gzipBytes: number | null = null;
  let brotliBytes: number | null = null;
  if (options.gzip) {
    try {
      gzipBytes = gzipSync(buffer).length;
    } catch {
      gzipBytes = null;
    }
  }
  if (options.brotli) {
    try {
      brotliBytes = brotliCompressSync(buffer).length;
    } catch {
      brotliBytes = null;
    }
  }
  return { gzipBytes, brotliBytes };
}
