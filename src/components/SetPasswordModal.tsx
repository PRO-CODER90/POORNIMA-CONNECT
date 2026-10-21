"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { ErrorBanner, EyeToggle, ICON_LOCK, Icon, inputCls, postJson, primaryBtn, Spinner } from "@/components/ui";
import { RULES, strength } from "@/lib/passwordRules";

export type SetMode = "setup" | "reset";

interface Props {
  token: string;
  mode: SetMode;
  name?: string; // known up front for the Google route; otherwise fetched when the token is validated
  onClose: () => void;
  onDone: () => void;
  onRequestNewLink: () => void;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-white/20", "bg-red-400", "bg-amber-400", "bg-lime-400", "bg-emerald-400"];

export default function SetPasswordModal({ token, mode, name: initialName, onClose, onDone, onRequestNewLink }: Props) {
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Check the link as soon as the pop-up opens, so an expired link is reported immediately.
  useEffect(() => {
    let alive = true;
    postJson<{ valid?: boolean; name?: string }>("/api/auth/validate-token", { token }).then((r) => {
      if (!alive) return;
      if (r.success && r.valid) {
        setName((n) => n ?? r.name);
        setState("ready");
      } else {
        setState("invalid");
        if (r.code === "NETWORK_ERROR") setError(r.message ?? null);
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const checks = RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const allOk = checks.every((c) => c.ok);
  const matches = confirm.length > 0 && password === confirm;
  const score = allOk ? Math.max(strength(password), 1) : Math.min(strength(password), 2);
  const canSubmit = allOk && matches && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    const r = await postJson("/api/auth/reset", { token, password, confirmPassword: confirm });
    if (r.success) return onDone();
    setBusy(false);
    if (r.code === "LINK_INVALID") setState("invalid");
    else setError(r.message ?? "Something went wrong. Please try again.");
  }

  const title = mode === "setup" ? "Set your password" : "Set a new password";

  return (
    <Modal titleId="sp-title" onClose={onClose}>
      <h2 id="sp-title" className="pr-8 text-2xl font-semibold">{title}</h2>

      {state === "checking" && (
        <div className="mt-6 flex items-center gap-3 text-sm text-white/80" role="status">
          <Spinner /> Checking your link…
        </div>
      )}

      {state === "invalid" && (
        <div className="mt-5 space-y-4">
          <ErrorBanner>{error ?? "This link is invalid or has expired. Please request a new one."}</ErrorBanner>
          {mode === "reset" ? (
            <button type="button" onClick={onRequestNewLink} data-autofocus className={primaryBtn}>
              Request new login details
            </button>
          ) : (
            <>
              <p className="text-sm text-white/80">
                To get a new setup link, close this and sign in with your enrollment number.
              </p>
              <button type="button" onClick={onClose} data-autofocus className={primaryBtn}>
                Back to sign in
              </button>
            </>
          )}
        </div>
      )}

      {state === "ready" && (
        <form onSubmit={submit} className="mt-2 space-y-3" noValidate>
          <p className="text-sm text-white/80">
            {mode === "setup"
              ? `Welcome${name ? `, ${name}` : ""}. Choose a password to activate your account.`
              : `Hi${name ? ` ${name}` : ""}, choose a new password for your account.`}
          </p>

          <div className="relative">
            <label htmlFor="sp-new" className="sr-only">New password</label>
            <Icon d={ICON_LOCK} />
            <input
              id="sp-new"
              autoFocus
              type={show ? "text" : "password"}
              className={`${inputCls} pr-11`}
              placeholder="New password"
              autoComplete="new-password"
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="sp-rules"
            />
            <EyeToggle shown={show} onToggle={() => setShow((v) => !v)} label="password" />
          </div>

          <div aria-hidden={password.length === 0} className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${password && i <= score ? COLORS[score] : "bg-white/20"}`} />
              ))}
            </div>
            <span className="w-14 text-right text-xs text-white/70" aria-live="polite">{password ? LABELS[score] : ""}</span>
          </div>

          <ul id="sp-rules" className="space-y-1 text-xs">
            {checks.map((c) => (
              <li key={c.id} className={`flex items-center gap-2 ${c.ok ? "text-emerald-300" : "text-white/65"}`}>
                <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${c.ok ? "bg-emerald-400/30" : "bg-white/10"}`}>
                  {c.ok ? "✓" : ""}
                </span>
                {c.label}
                <span className="sr-only">{c.ok ? " (met)" : " (not met)"}</span>
              </li>
            ))}
            <li className={`flex items-center gap-2 ${matches ? "text-emerald-300" : "text-white/65"}`}>
              <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${matches ? "bg-emerald-400/30" : "bg-white/10"}`}>
                {matches ? "✓" : ""}
              </span>
              Both passwords match
              <span className="sr-only">{matches ? " (met)" : " (not met)"}</span>
            </li>
          </ul>

          <div className="relative">
            <label htmlFor="sp-confirm" className="sr-only">Confirm password</label>
            <Icon d={ICON_LOCK} />
            <input
              id="sp-confirm"
              type={showConfirm ? "text" : "password"}
              className={`${inputCls} pr-11`}
              placeholder="Confirm password"
              autoComplete="new-password"
              maxLength={64}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
          </div>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <button type="submit" disabled={!canSubmit} className={primaryBtn}>
            {busy ? (<><Spinner /> Saving…</>) : "Set Password"}
          </button>
        </form>
      )}
    </Modal>
  );
}
