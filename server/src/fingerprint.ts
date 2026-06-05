/**
 * File fingerprinting
 *  • SHA-256: authoritative integrity hash (Node crypto)
 *  • pHash:   perceptual hash — dHash 64-bit (difference hash via sharp)
 *             For non-images falls back to first 64 bits of SHA-256.
 *  • similarity: Hamming distance → [0,1] score
 *
 * Thresholds (as per spec):
 *   ≥ 0.92  → near-identical / authentic
 *   0.55–0.92 → derivative / modified
 *   < 0.55  → unrelated / unknown
 */
import { createHash } from 'node:crypto';
import type { Sharp } from 'sharp';

// Lazy-import sharp so the module still loads if the native addon is missing
let sharpMod: ((input: Buffer) => Sharp) | null = null;
async function getSharp() {
  if (sharpMod) return sharpMod;
  try {
    const mod = await import('sharp');
    sharpMod = mod.default as (input: Buffer) => Sharp;
    return sharpMod;
  } catch {
    return null;
  }
}

// ── SHA-256 ───────────────────────────────────────────────────────────────────

export function sha256Hex(bytes: Uint8Array | Buffer): string {
  return '0x' + createHash('sha256').update(bytes).digest('hex');
}

// ── pHash (dHash 64-bit) ──────────────────────────────────────────────────────

/**
 * Compute a 64-bit difference hash as a 16-char hex string.
 * Algorithm:
 *   1. Resize to 9×8 grayscale (no dithering)
 *   2. For each row: compare adjacent pixels (left vs right) → 8 bits per row
 *   3. Assemble 64 bits → 16 hex chars
 *
 * Falls back to the first 16 hex chars of sha256 for non-image types.
 */
export async function phashHex(bytes: Buffer, mediaType: string): Promise<string> {
  if (!mediaType.startsWith('image/')) {
    // Non-image: use sha256 prefix as a stable fingerprint
    return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  }

  const sharp = await getSharp();
  if (!sharp) {
    // sharp not available — degrade gracefully
    return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  }

  try {
    // 9×8 = 72 pixels, compare adjacent → 8 bits per row = 64 bits total
    const { data } = await sharp(bytes)
      .resize(9, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = row * 9 + col;
        bits += data[idx] < data[idx + 1] ? '1' : '0';
      }
    }

    // Convert 64 bits to 16 hex chars
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  }
}

// ── Hamming similarity ────────────────────────────────────────────────────────

/**
 * Compute similarity score [0,1] between two 16-char hex pHash strings.
 * 1.0 = identical, 0.0 = maximally different.
 */
export function phashSimilarity(a: string, b: string): number {
  if (a.length !== b.length) return 0;
  // Convert hex → 64-bit binary string
  const toBin = (hex: string) =>
    hex.split('').map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join('');

  const binA = toBin(a);
  const binB = toBin(b);
  let same = 0;
  for (let i = 0; i < binA.length; i++) {
    if (binA[i] === binB[i]) same++;
  }
  return same / binA.length;
}

// ── Threshold helpers ─────────────────────────────────────────────────────────

export const THRESHOLDS = { authentic: 0.92, modified: 0.55 } as const;

export function classifyByPhash(similarity: number): 'authentic' | 'modified' | 'unknown' {
  if (similarity >= THRESHOLDS.authentic) return 'authentic';
  if (similarity >= THRESHOLDS.modified) return 'modified';
  return 'unknown';
}

// ── Image metadata ────────────────────────────────────────────────────────────

export async function imageMetadata(bytes: Buffer): Promise<Record<string, unknown>> {
  const sharp = await getSharp();
  if (!sharp) return {};
  try {
    const meta = await sharp(bytes).metadata();
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format,
      space: meta.space,
      hasAlpha: meta.hasAlpha,
      density: meta.density,
      exif: meta.exif ? '[present]' : undefined,
    };
  } catch {
    return {};
  }
}
