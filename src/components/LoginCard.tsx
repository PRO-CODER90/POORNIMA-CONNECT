"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import GoogleButton from "@/components/GoogleButton";
import Modal from "@/components/Modal";
import SetPasswordModal, { type SetMode } from "@/components/SetPasswordModal";
import { ErrorBanner, EyeToggle, ICON_LOCK, ICON_USER, Icon, inputCls, postJson, primaryBtn, Spinner, SuccessBanner } from "@/components/ui";
import { ERRORS, type ErrorCode } from "@/lib/errors";

type ModalState =
  | { k: "forgot" }
  | { k: "emailSent"; message: string }
  | { k: "set"; token: string; mode: SetMode; name?: string };

// Inlined at build time. Without it there is no Google button, so no divider either.
const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

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
  const [modal, setModal] = useState<ModalState | null>(
    initialLink ? { k: "set", token: initialLink.token, mode: initialLink.mode } : null,
  );

  // Don't leave the one-time token in the address bar / history.
  useEffect(() => {
    if (initialLink) window.history.replaceState(null, "", "/");
  }, [initialLink]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const enr = enrollmentNo.trim();
    if (!enr || !password) return setError(ERRORS.MISSING_FIELDS.message);
    if (!/^\d+$/.test(enr)) return setError(ERRORS.INVALID_ENROLLMENT_FORMAT.message);

    setBusy(true);
    const r = await postJson<{ redirect?: string; changeToken?: string; name?: string }>("/api/auth/login", { enrollmentNo: enr, password });
    if (r.success) {
      router.push(r.redirect ?? "/dashboard");
      return; // keep the spinner until navigation
    }
    setBusy(false);
    if (r.code === "PASSWORD_CHANGE_REQUIRED" && r.changeToken) {
      // Signed in with the emailed temporary password: choose a new one now.
      setPassword("");
      setModal({ k: "set", token: r.changeToken, mode: "reset", name: r.name });
    } else if (r.code === "SETUP_REQUIRED_EMAIL") setModal({ k: "emailSent", message: r.message ?? ERRORS.SETUP_REQUIRED_EMAIL.message });
    else setError(r.message ?? ERRORS.NETWORK_ERROR.message);
  }

  return (
    <section
      className="w-full rounded-3xl border border-white/25 bg-white/[0.12] p-6 text-center shadow-2xl backdrop-blur-[18px] sm:p-8 lg:max-w-[400px]"
      aria-labelledby="signin-title"
    >
      <h2 id="signin-title" className="text-2xl font-semibold">Sign In</h2>
      <p className="mt-1 text-sm text-white/80">Welcome to University Portal</p>

      <form onSubmit={submit} className="mt-6 space-y-3 text-left" noValidate>
        {notice && <SuccessBanner>{notice}</SuccessBanner>}

        <div className="relative">
          <label htmlFor="enrollment" className="sr-only">Enrollment No.</label>
          <Icon d={ICON_USER} />
          <input
            id="enrollment"
            name="username"
            type="text"
            className={`${inputCls} pr-4`}
            placeholder="Enrollment No."
            inputMode="numeric"
            autoComplete="username"
            maxLength={12}
            aria-describedby={error ? "login-error" : undefined}
            value={enrollmentNo}
            onChange={(e) => setEnrollmentNo(e.target.value)}
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
            aria-describedby={error ? "login-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <EyeToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} label="password" />
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={() => setModal({ k: "forgot" })}
            className="text-xs text-sky-300 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Forgot password?
          </button>
        </div>

        {error && <ErrorBanner id="login-error">{error}</ErrorBanner>}

        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? (<><Spinner /> Signing in…</>) : (<>Sign In <span aria-hidden="true">→</span></>)}
        </button>
      </form>

      {googleEnabled && (
        <div className="my-5 flex items-center gap-3 text-xs text-white/70" aria-hidden="true">
          <span className="h-px flex-1 bg-white/25" /> or <span className="h-px flex-1 bg-white/25" />
        </div>
      )}

      <div className={`${googleEnabled ? "" : "mt-4"} ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <GoogleButton
          onBusy={setBusy}
          onError={setError}
          onSuccess={(redirect) => router.push(redirect)}
          onSetupRequired={(token, name) => setModal({ k: "set", token, mode: "setup", name })}
        />
      </div>

      <p className="mt-6 text-xs text-white/80">
        Need help?{" "}
        <a href="mailto:support@poornima.edu.in" className="text-sky-300 underline underline-offset-2">
          Contact support
        </a>
      </p>

      {modal?.k === "forgot" && <ForgotPasswordModal onClose={() => setModal(null)} />}

      {modal?.k === "emailSent" && (
        <Modal titleId="es-title" onClose={() => setModal(null)}>
          <h2 id="es-title" className="pr-8 text-2xl font-semibold">Check your email</h2>
          <p className="mt-3 text-sm text-white/85">{modal.message}</p>
          <p className="mt-2 text-xs text-white/65">The link expires in 60 minutes and can be used once.</p>
          <button type="button" data-autofocus onClick={() => setModal(null)} className={`${primaryBtn} mt-5`}>
            Back to sign in
          </button>
        </Modal>
      )}

      {modal?.k === "set" && (
        <SetPasswordModal
          token={modal.token}
          mode={modal.mode}
          name={modal.name}
          onClose={() => setModal(null)}
          onRequestNewLink={() => setModal({ k: "forgot" })}
          onDone={() => {
            setModal(null);
            setError(null);
            setNotice("Password set successfully. Please sign in.");
          }}
        />
      )}
    </section>
  );
}
