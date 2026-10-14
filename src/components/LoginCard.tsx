"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleButton from "@/components/GoogleButton";
import { ERRORS, type ErrorCode } from "@/lib/errors";

type Role = "student" | "faculty";

const inputCls =
  "w-full rounded-xl border border-white/25 bg-white/10 py-3 pl-11 text-sm text-white placeholder-white/60 outline-none focus:border-white/70 focus:ring-2 focus:ring-white/30";

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export default function LoginCard({ initialError }: { initialError?: ErrorCode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError].message : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const enr = enrollmentNo.trim();
    if (!enr || !passcode) return setError(ERRORS.MISSING_FIELDS.message);
    if (!/^\d+$/.test(enr)) return setError(ERRORS.INVALID_ENROLLMENT_FORMAT.message);

    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, enrollmentNo: enr, passcode }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.redirect ?? "/dashboard");
        return; // keep the spinner until navigation
      }
      setError(data.message ?? ERRORS.NETWORK_ERROR.message);
    } catch {
      setError(ERRORS.NETWORK_ERROR.message);
    }
    setBusy(false);
  }

  return (
    <section
      className="w-full rounded-3xl border border-white/25 bg-white/[0.12] p-6 text-center shadow-2xl backdrop-blur-[18px] sm:p-8 lg:max-w-[400px]"
      aria-labelledby="signin-title"
    >
      <h2 id="signin-title" className="text-2xl font-semibold">Sign In</h2>
      <p className="mt-1 text-sm text-white/80">Welcome to University Portal</p>

      <form onSubmit={submit} className="mt-6 space-y-3 text-left" noValidate>
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 rounded-xl border border-white/25 bg-white/10 p-1 text-sm">
          {(["student", "faculty"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`rounded-lg py-2 font-medium capitalize transition ${role === r ? "bg-white text-zinc-900" : "text-white/80 hover:bg-white/10"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="enrollment" className="sr-only">Enrollment No.</label>
          <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <input
            id="enrollment"
            className={`${inputCls} pr-4`}
            placeholder="Enrollment No."
            inputMode="numeric"
            autoComplete="username"
            value={enrollmentNo}
            onChange={(e) => setEnrollmentNo(e.target.value)}
          />
        </div>

        <div className="relative">
          <label htmlFor="passcode" className="sr-only">Passcode</label>
          <Icon d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
          <input
            id="passcode"
            type={showPass ? "text" : "password"}
            className={`${inputCls} pr-11`}
            placeholder="Passcode"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Hide passcode" : "Show passcode"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPass && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2.5 text-sm text-red-50 backdrop-blur">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-70"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>Sign In <span aria-hidden="true">→</span></>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-white/70" aria-hidden="true">
        <span className="h-px flex-1 bg-white/25" /> or <span className="h-px flex-1 bg-white/25" />
      </div>

      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <GoogleButton
          onBusy={setBusy}
          onError={setError}
          onSuccess={(redirect) => router.push(redirect)}
        />
      </div>

      <p className="mt-6 text-xs text-white/80">
        Need help?{" "}
        <a href="mailto:support@poornima.edu.in" className="text-sky-300 underline underline-offset-2">
          Contact support
        </a>
      </p>
    </section>
  );
}
