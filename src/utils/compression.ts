import { brotliCompressSync, gzipSync } from "node:zlib";
import type { ResolvedCompression } from "../types/config.js";

export type CompressedSizes = {
  gzipBytes: number | null;
  brotliBytes: number | null;
};

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
