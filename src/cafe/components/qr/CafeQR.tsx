'use client';

import { QRCodeSVG } from 'qrcode.react';

/**
 * Cafe QR (spec §94/§95): encodes ONLY the public cafe route
 * (https://<origin>/cafe/<CODE>) — no passwords, no personal data.
 * Scanning on a logged-out phone lands on the portal sign-in page and
 * students then open the cafe from their dashboard.
 */
export default function CafeQR({ cafeCode, cafeName, appUrl }: { cafeCode: string; cafeName: string; appUrl?: string | null }) {
  const base =
    appUrl && appUrl.startsWith('http')
      ? appUrl.replace(/\/$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
  const url = base ? `${base}/cafe/${cafeCode}` : `/cafe/${cafeCode}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center">
      <div className="rounded-xl bg-white p-2" aria-label={`QR code for ${cafeName}`}>
        <QRCodeSVG value={url} size={160} level="M" />
      </div>
      <div>
        <div className="text-sm font-extrabold text-slate-900">{cafeName}</div>
        <div className="mt-0.5 font-mono text-[11px] text-slate-400">/cafe/{cafeCode}</div>
        <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-400">
          Print this at the cafe counter. Students scan it, log in, and this cafe opens directly.
        </p>
      </div>
    </div>
  );
}
