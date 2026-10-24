"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ForgotPassword from "@/components/ForgotPassword";
import GoogleButton from "@/components/GoogleButton";
import SetPassword, { type SetMode } from "@/components/SetPassword";
import { ErrorBanner, EyeToggle, ICON_LOCK, ICON_USER, Icon, inputCls, postJson, primaryBtn, Spinner, SuccessBanner, WarnBanner } from "@/components/ui";
import { ERRORS, type ErrorCode } from "@/lib/errors";

// Everything happens inside the card: it switches between these screens (no pop-ups).
type View =
  | { k: "signin" }
  | { k: "forgot" }
  | { k: "emailSent"; message: string }
  | { k: "set"; token: string; mode: SetMode; name?: string };

// Inlined at build time. Without it there is no Google button, so no divider either.
const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// A lock the server told us about, remembered so a refresh still shows the countdown. UX only: the server re-checks every request.
const lockKey = (id: string) => `pu_lock_${id}`;
function readLock(id: string): number | null {
  try {
    const v = Number(localStorage.getItem(lockKey(id)));
    return v > Date.now() ? v : null;
  } catch {
    return null;
  }
}
function writeLock(id: string, until: number | null) {
  try {
    if (until) localStorage.setItem(lockKey(id), String(until));
    else localStorage.removeItem(lockKey(id));
  } catch {}
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

interface Props {
  initialError?: ErrorCode;
  initialLink?: { token: string; mode: SetMode };
}

export default function LoginCard({ initialError, initialLink }: Props) {
  const router = useRouter();
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError].message : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  // Lock end as a time on THIS device's clock (server end time shifted by the clock difference), so a wrong laptop clock doesn't break the countdown.
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const lockedId = useRef("");
  const [view, setView] = useState<View>(
    initialLink ? { k: "set", token: initialLink.token, mode: initialLink.mode } : { k: "signin" },
  );

  // Don't leave the one-time token in the address bar / history.
  useEffect(() => {
    if (initialLink) window.history.replaceState(null, "", "/");
  }, [initialLink]);

  const locked = lockedUntil !== null;
  const backToSignIn = () => setView({ k: "signin" });

  // Live countdown; unlocks the form when it reaches zero.
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        writeLock(lockedId.current, null);
        setLockedUntil(null);
        setRemaining(0);
        setError(null);
        setAttemptsLeft(null);
      } else setRemaining(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  // Show a remembered lock when the visitor types an ID that is still locked.
  function onIdChange(v: string) {
    setEnrollmentNo(v);
    const id = v.trim().toUpperCase();
    const until = id ? readLock(id) : null;
    if (until && until !== lockedUntil) {
      lockedId.current = id;
      setLockedUntil(until);
    } else if (!until && lockedUntil && id !== lockedId.current) {
      setLockedUntil(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const enr = enrollmentNo.trim().toUpperCase();
    if (!enr || !password) return setError(ERRORS.MISSING_FIELDS.message);
    if (!/^[A-Z0-9]+$/.test(enr)) return setError(ERRORS.INVALID_ENROLLMENT_FORMAT.message);

    setBusy(true);
    const r = await postJson<{ redirect?: string; changeToken?: string; name?: string; attemptsLeft?: number; retryAfterSeconds?: number }>(
      "/api/auth/login",
      { enrollmentNo: enr, password },
    );
    if (r.success) {
      router.push(r.redirect ?? "/dashboard");
      return; // keep the spinner until navigation
    }
    setBusy(false);
    setPassword(""); // never keep a rejected password in the field
    if (r.code === "ACCOUNT_LOCKED") {
      const seconds = Math.max(1, Number(r.retryAfterSeconds) || 300);
      const until = Date.now() + seconds * 1000;
      lockedId.current = enr;
      writeLock(enr, until);
      setAttemptsLeft(null);
      setLockedUntil(until);
      setRemaining(seconds);
      setError(null);
    } else if (r.code === "INVALID_CREDENTIALS") {
      setAttemptsLeft(typeof r.attemptsLeft === "number" ? r.attemptsLeft : null);
      setError(r.message ?? ERRORS.INVALID_CREDENTIALS.message);
    } else if (r.code === "PASSWORD_CHANGE_REQUIRED" && r.changeToken) {
      // Signed in with the emailed temporary password: choose a new one now.
      setView({ k: "set", token: r.changeToken, mode: "reset", name: r.name });
    } else if (r.code === "SETUP_REQUIRED_EMAIL") {
      setView({ k: "emailSent", message: r.message ?? ERRORS.SETUP_REQUIRED_EMAIL.message });
    } else setError(r.message ?? ERRORS.NETWORK_ERROR.message);
  }

  return (
    <section
      className="surface w-full bg-white/95 p-6 text-center text-ink shadow-2xl sm:p-8 lg:max-w-[400px]"
      aria-labelledby="card-title"
    >
      {view.k === "forgot" && <ForgotPassword onBack={backToSignIn} />}

      {view.k === "emailSent" && (
        <div className="space-y-4 text-left">
          <h2 id="card-title" className="text-center text-2xl font-semibold">Check your email</h2>
          <SuccessBanner>{view.message}</SuccessBanner>
          <p className="text-xs text-slate-600">The link expires in 60 minutes and can be used once.</p>
          <button type="button" autoFocus onClick={backToSignIn} className={primaryBtn}>
            Back to sign in
          </button>
        </div>
      )}

      {view.k === "set" && (
        <SetPassword
          token={view.token}
          mode={view.mode}
          name={view.name}
          onBack={backToSignIn}
          onRequestNewLink={() => setView({ k: "forgot" })}
          onDone={() => {
            setView({ k: "signin" });
            setError(null);
            setNotice("Password set successfully. Please sign in.");
          }}
        />
      )}

      {view.k === "signin" && (
        <>
          <h2 id="card-title" className="text-2xl font-semibold">Sign In</h2>
          <p className="mt-1 text-sm text-slate-600">Welcome to University Portal</p>

          <form onSubmit={submit} className="mt-6 space-y-3 text-left" noValidate>
            {notice && <SuccessBanner>{notice}</SuccessBanner>}

            <div className="relative">
              <label htmlFor="enrollment" className="sr-only">Enrollment No. or Staff ID</label>
              <Icon d={ICON_USER} />
              <input
                id="enrollment"
                name="username"
                type="text"
                className={`${inputCls} pr-4`}
                placeholder="Enrollment No. / Staff ID"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={locked}
                maxLength={12}
                aria-describedby={error ? "login-error" : undefined}
                value={enrollmentNo}
                onChange={(e) => onIdChange(e.target.value)}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <Icon d={ICON_LOCK} />
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                className={`${inputCls} pr-11`}
                placeholder="Password"
                autoComplete="current-password"
                maxLength={64}
                disabled={locked}
                aria-describedby={error ? "login-error" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <EyeToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} label="password" />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setView({ k: "forgot" });
                }}
                className="text-xs font-medium text-pu-600 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-pu-500/40"
              >
                Forgot password?
              </button>
            </div>

            {locked && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-left text-sm text-rose-800">
                <div className="font-semibold">Too many failed attempts</div>
                <div className="mt-0.5">
                  Try again in <span className="font-mono font-bold tabular-nums">{mmss(remaining)}</span>.
                </div>
                <div className="mt-1 text-xs">You can still sign in with Google or reset your password.</div>
              </div>
            )}
            {!locked && error && <ErrorBanner id="login-error">{error}</ErrorBanner>}
            {!locked && error && attemptsLeft !== null && attemptsLeft > 0 && (
              <WarnBanner>
                {attemptsLeft === 1
                  ? "Last attempt before a 5-minute lock."
                  : `${attemptsLeft} attempts remaining.`}
              </WarnBanner>
            )}

            <button type="submit" disabled={busy || locked} className={primaryBtn}>
              {busy ? (<><Spinner /> Signing in…</>) : (<>Sign In <span aria-hidden="true">→</span></>)}
            </button>
          </form>

          {googleEnabled && (
            <div className="my-5 flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>
          )}

          <div className={`${googleEnabled ? "" : "mt-4"} ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <GoogleButton
              onBusy={setBusy}
              onError={setError}
              onSuccess={(redirect) => router.push(redirect)}
              onSetupRequired={(token, name) => setView({ k: "set", token, mode: "setup", name })}
            />
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-slate-600">
        Need help?{" "}
        <a href="mailto:support@poornima.edu.in" className="font-medium text-pu-600 underline underline-offset-2">
          Contact support
        </a>
      </p>
    </section>
  );
}
