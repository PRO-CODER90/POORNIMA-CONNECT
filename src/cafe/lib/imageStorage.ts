// Where uploaded product photos live. Vercel Blob in production (BLOB_READ_WRITE_TOKEN set);
// local disk under public/uploads in development only, because a serverless filesystem is
// read-only and files written there would silently disappear.
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEMO_IMAGE_PREFIX } from './stock';

export interface ImageStorage {
  put(buf: Buffer, key: string): Promise<string>;
  remove(url: string): Promise<void>;
}

const blobStorage: ImageStorage = {
  async put(buf, key) {
    const { put } = await import('@vercel/blob');
    const r = await put(key, buf, { access: 'public', contentType: 'image/webp', addRandomSuffix: false });
    return r.url;
  },
  async remove(url) {
    const { del } = await import('@vercel/blob');
    await del(url);
  },
};

const LOCAL_ROOT = path.join(process.cwd(), 'public');
const localStorage: ImageStorage = {
  async put(buf, key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Image uploads need BLOB_READ_WRITE_TOKEN in production (local disk is not persistent).');
    }
    const rel = path.posix.join('uploads', key);
    const file = path.join(LOCAL_ROOT, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, buf);
    return `/${rel}`;
  },
  async remove(url) {
    if (!url.startsWith('/uploads/menu/')) return;
    await unlink(path.join(LOCAL_ROOT, url)).catch(() => undefined);
  },
};

export function imageStorage(): ImageStorage {
  return process.env.BLOB_READ_WRITE_TOKEN ? blobStorage : localStorage;
}

export const imageUploadsEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN || process.env.NODE_ENV !== 'production';

/** Deletes a replaced photo, unless it is a demo image or another item still uses it. Best-effort. */
export async function removeImageIfUnused(url: string | null | undefined, stillUsed: (url: string) => Promise<boolean>) {
  if (!url || url.startsWith(DEMO_IMAGE_PREFIX)) return;
  try {
    if (!(await stillUsed(url))) await imageStorage().remove(url);
  } catch (e) {
    console.error('[image] could not remove old image', e instanceof Error ? e.message : e);
  }
}
