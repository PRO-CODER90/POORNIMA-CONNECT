// Turns an untrusted upload into a safe product photo: real type from the file's first bytes
// (the browser's Content-Type and filename are ignored), then a full re-encode that strips all
// metadata and defuses polyglot files.
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type ImageKind = 'jpeg' | 'png' | 'webp';

export function detectImageType(b: Uint8Array): ImageKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}

export class UploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Validates and re-encodes to an 800×800 WebP with no EXIF/GPS. */
export async function toProductWebp(input: Uint8Array): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError(413, 'The photo is larger than 2 MB.');
  if (!detectImageType(input)) throw new UploadError(415, 'Use a JPG, PNG or WebP photo.');
  try {
    return await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // apply EXIF orientation, then the metadata is dropped (sharp keeps none by default)
      .resize({ width: 800, height: 800, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new UploadError(415, 'That file could not be read as an image.');
  }
}

/** Storage key chosen by the server; the user's filename is never used. */
export function productImageKey(cafeCode: string): string {
  return `menu/${cafeCode.replace(/[^A-Za-z0-9-]/g, '') || 'cafe'}/${randomUUID()}.webp`;
}
