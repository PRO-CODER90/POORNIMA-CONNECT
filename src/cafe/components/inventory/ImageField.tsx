'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, RotateCcw, Upload } from 'lucide-react';
import { demoImageFor, isDemoImage } from '@/cafe/lib/stock';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 2 * 1024 * 1024;

/** Shrinks a photo in the browser (≤ 1200 px, WebP/JPEG) so uploads are small and quick. */
async function downscale(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
  return (await toBlob('image/webp')) ?? (await toBlob('image/jpeg')) ?? file;
}

/** Upload with progress (fetch has no upload progress, XHR does). */
function send(url: string, blob: Blob, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let d: { url?: string; error?: string; message?: string } = {};
      try {
        d = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && d.url) resolve(d.url);
      else reject(new Error(d.error ?? d.message ?? 'Upload failed. Please try again.'));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    const fd = new FormData();
    fd.append('file', blob, 'photo');
    xhr.send(fd);
  });
}

export default function ImageField({
  value,
  onChange,
  uploadUrl,
  categoryName,
  itemType,
  onBusyChange,
  error,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  uploadUrl: string;
  categoryName?: string;
  itemType: string;
  onBusyChange: (busy: boolean) => void;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  const shown = value || demoImageFor(categoryName, itemType);
  const demo = isDemoImage(value);

  const upload = async (file: File) => {
    setFailure(null);
    setLastFile(file);
    if (!ACCEPT.split(',').includes(file.type)) return setFailure('Use a JPG, PNG or WebP photo.');
    if (file.size > 12 * MAX_BYTES) return setFailure('That photo is too large.');
    onBusyChange(true);
    setProgress(0);
    try {
      const blob = await downscale(file).catch(() => file);
      if (blob.size > MAX_BYTES) throw new Error('The photo is still over 2 MB after resizing. Try a smaller one.');
      onChange(await send(uploadUrl, blob, setProgress)); // the old image stays until this succeeds
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void upload(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-slate-100 ${drag ? 'border-pu-500 border-dashed' : 'border-slate-200'}`}
      >
        <Image src={shown} alt="Item photo preview" fill sizes="(min-width:640px) 320px, 100vw" className="object-cover" />
        {demo ? (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-sm">Demo image</span>
        ) : null}
        {progress !== null ? (
          <div className="absolute inset-x-0 bottom-0 bg-white/90 p-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <div className="h-full bg-pu-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-outline-pu" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
          {demo ? <ImagePlus size={14} aria-hidden /> : <Upload size={14} aria-hidden />}
          {demo ? 'Upload photo' : 'Change photo'}
        </button>
        <button type="button" className="btn-outline-pu sm:hidden" onClick={() => camRef.current?.click()} disabled={progress !== null}>
          <Camera size={14} aria-hidden />
          Camera
        </button>
        {!demo ? (
          <button type="button" className="btn-outline-pu" onClick={() => onChange(null)} disabled={progress !== null}>
            <RotateCcw size={14} aria-hidden />
            Remove
          </button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={pick} aria-label="Choose a photo" />
      <input ref={camRef} type="file" accept={ACCEPT} capture="environment" className="hidden" onChange={pick} aria-label="Take a photo" />
      <p className="mt-1.5 text-[11px] text-slate-500">Square or 4:3 photos work best. JPG, PNG or WebP, up to 2 MB. You can also drop a photo on the box.</p>
      {failure ? (
        <p className="mt-1 text-xs font-medium text-rose-600" role="alert">
          {failure}{' '}
          {lastFile ? (
            <button type="button" className="underline" onClick={() => void upload(lastFile)}>
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
