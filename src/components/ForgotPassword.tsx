"use client";

import { useState } from "react";
import { BackLink, ErrorBanner, ICON_MAIL, Icon, inputCls, postJson, primaryBtn, Spinner, SuccessBanner } from "@/components/ui";

/** "Forgot password" screen shown inside the login card. */
export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) return setError("Please fill in all required fields.");
    setBusy(true);
    const r = await postJson("/api/auth/forgot", { identifier: identifier.trim() });
    setBusy(false);
    if (r.success) setSent(r.message ?? "If this account exists, your login details have been sent to the registered email.");
    else setError(r.message ?? "Something went wrong. Please try again.");
  }

  return (
    <div className="text-left">
      {sent ? (
        <div className="space-y-4">
          <h2 id="card-title" className="text-center text-2xl font-semibold">Check your email</h2>
          <SuccessBanner>{sent}</SuccessBanner>
          <button type="button" onClick={onBack} autoFocus className={primaryBtn}>Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <h2 id="card-title" className="text-center text-2xl font-semibold">Reset your password</h2>
          <p className="text-sm text-white/80">
            Enter your university email or enrollment number. If you&apos;ve already set a password, we&apos;ll email your
            login ID and a temporary password to the address on record.
          </p>
          <p className="text-xs text-white/65">
            Haven&apos;t set a password yet? Go back and sign in with your enrollment number to get a setup link.
          </p>
          <div className="relative">
            <label htmlFor="fp-id" className="sr-only">Email or enrollment number</label>
            <Icon d={ICON_MAIL} />
            <input
              id="fp-id"
              autoFocus
              className={`${inputCls} pr-4`}
              placeholder="Email or Enrollment No."
              autoComplete="username"
              maxLength={200}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? (<><Spinner /> Sending…</>) : "Send login details"}
          </button>
          <div className="pt-1 text-center">
            <BackLink onClick={onBack} />
          </div>
        </form>
      )}
    </div>
  );
}
