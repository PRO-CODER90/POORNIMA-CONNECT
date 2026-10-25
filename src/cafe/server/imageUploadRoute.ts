import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { isLimited, recordHit } from '@/lib/rateLimit';
import { imageStorage, imageUploadsEnabled } from '@/cafe/lib/imageStorage';
import { MAX_UPLOAD_BYTES, productImageKey, toProductWebp, UploadError } from '@/cafe/lib/imageUpload';

const UPLOAD_LIMIT = { max: 20, windowS: 3600 };

/** Shared body of the staff and admin upload endpoints. The caller has already checked the role. */
export async function handleImageUpload(req: Request, actor: { userId: string; cafeCode: string }): Promise<Response> {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  if (!imageUploadsEnabled()) {
    return NextResponse.json({ error: 'Photo uploads are not set up yet (BLOB_READ_WRITE_TOKEN missing).' }, { status: 503 });
  }
  const key = [`upload:${actor.userId}`];
  if (await isLimited(key, UPLOAD_LIMIT)) {
    return NextResponse.json({ error: 'Too many uploads. Try again in an hour.' }, { status: 429 });
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: 'The photo is larger than 2 MB.' }, { status: 413 });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Send the photo as form data in a "file" field.' }, { status: 400 });
  }
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a photo to upload.' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'The photo is larger than 2 MB.' }, { status: 413 });

  await recordHit(key, UPLOAD_LIMIT);
  try {
    const webp = await toProductWebp(new Uint8Array(await file.arrayBuffer()));
    const url = await imageStorage().put(webp, productImageKey(actor.cafeCode));
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[upload]', e);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
