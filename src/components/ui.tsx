import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-white/25 bg-white/10 py-3 pl-11 text-sm text-white placeholder-white/80 outline-none focus:border-white/70 focus:ring-2 focus:ring-white/30";

export const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60";

export const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
);

export const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
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
    <div id={id} role="alert" className="flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2.5 text-left text-sm text-red-50 backdrop-blur">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2.5 text-left text-sm text-emerald-50 backdrop-blur">
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
      className="text-xs text-sky-300 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
    >
      ← Back to sign in
    </button>
  );
}
