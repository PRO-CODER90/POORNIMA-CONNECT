"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ERRORS, type ErrorCode } from "@/lib/errors";

interface GoogleId {
  initialize(cfg: {
    client_id: string;
    callback: (r: { credential: string }) => void;
    hd?: string;
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

type ApiResult = {
  success: boolean;
  code?: ErrorCode;
  message?: string;
  needsVerification?: boolean;
  tempToken?: string;
  redirect?: string;
};

async function post(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: ERRORS.NETWORK_ERROR.message };
  }
}

const inputCls =
  "w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none focus:border-white/70 focus:ring-2 focus:ring-white/30";

export default function LoginCard({ initialError }: { initialError?: ErrorCode }) {
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError].message : null);
  const router = useRouter();
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const shownError =
    error ?? (clientId ? null : "Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).");

  const onCredential = useCallback(async (credential: string) => {
    setError(null);
    setBusy(true);
    const r = await post("/api/auth/google", { idToken: credential });
    setBusy(false);
    if (r.success && r.needsVerification && r.tempToken) setTempToken(r.tempToken);
    else setError(r.message ?? ERRORS.GOOGLE_FAILED.message);
  }, []);

  useEffect(() => {
    if (!gsiReady || tempToken || !btnRef.current || !window.google) return;
    if (!clientId) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      hd: "poornima.edu.in",
      callback: (r) => onCredential(r.credential),
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: 320,
    });
  }, [gsiReady, tempToken, clientId, onCredential]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await post("/api/auth/verify", { tempToken, enrollmentNo, passcode });
    if (r.success) {
      router.push(r.redirect ?? "/dashboard");
      return;
    }
    setBusy(false);
    if (r.code === "SESSION_EXPIRED") setTempToken(null);
    setError(r.message ?? ERRORS.GOOGLE_FAILED.message);
  }

  return (
    <section
      className="w-full rounded-3xl border border-white/25 bg-white/[0.12] p-6 text-center shadow-2xl backdrop-blur-[18px] sm:p-8 lg:max-w-[400px]"
      aria-labelledby="signin-title"
    >
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGsiReady(true)} />

      <h2 id="signin-title" className="text-2xl font-semibold">Sign In</h2>
      <p className="mt-1 text-sm text-white/80">
        {tempToken ? "Verify your identity to continue" : "Welcome to University Portal"}
      </p>

      <div className="mt-6">
        {tempToken ? (
          <form onSubmit={verify} className="space-y-3 text-left">
            <label className="sr-only" htmlFor="enrollment">Enrollment No.</label>
            <input
              id="enrollment"
              className={inputCls}
              placeholder="Enrollment No."
              inputMode="numeric"
              autoComplete="off"
              value={enrollmentNo}
              onChange={(e) => setEnrollmentNo(e.target.value)}
              required
            />
            <label className="sr-only" htmlFor="passcode">Passcode</label>
            <input
              id="passcode"
              type="password"
              className={inputCls}
              placeholder="Passcode"
              autoComplete="off"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Continue"}
            </button>
          </form>
        ) : (
          <div className="flex min-h-11 justify-center">
            <div ref={btnRef} aria-busy={busy} className={busy ? "pointer-events-none opacity-60" : ""} />
          </div>
        )}
      </div>

      {shownError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2.5 text-left text-sm text-red-50 backdrop-blur"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
          </svg>
          <span>{shownError}</span>
        </div>
      )}

      <p className="mt-6 text-xs text-white/80">
        Need help?{" "}
        <a href="mailto:support@poornima.edu.in" className="text-sky-300 underline underline-offset-2">
          Contact support
        </a>
      </p>
    </section>
  );
}
