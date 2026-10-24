import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 text-sm text-ink placeholder-slate-500 outline-none transition-colors focus:border-pu-500 focus:ring-2 focus:ring-pu-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-pu-600 py-3 text-sm font-semibold text-white transition hover:bg-pu-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" aria-hidden="true" />
);

export const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const ICON_USER = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z";
export const ICON_LOCK = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4";
export const ICON_MAIL = "M3 6h18v12H3zM3 7l9 6 9-6";

export function EyeToggle({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? "Hide" : "Show"} ${label}`}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-ink focus:outline-none focus:ring-2 focus:ring-pu-500/40"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {shown && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

export function ErrorBanner({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div id={id} role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-sm text-rose-800">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function WarnBanner({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div id={id} role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-sm text-emerald-800">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.6-3.6-3.6 1.4-1.4 2.2 2.2 4.6-4.6 1.4 1.4-6 6Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<T & { success?: boolean; code?: string; message?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (data) return data;
    return { success: false, code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again shortly." } as never;
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "Network error. Check your connection and try again." } as never;
  }
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-pu-600 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-pu-500/40"
    >
      ← Back to sign in
    </button>
  );
}
