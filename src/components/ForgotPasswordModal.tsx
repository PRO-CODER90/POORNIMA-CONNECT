"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { ErrorBanner, ICON_MAIL, Icon, inputCls, postJson, primaryBtn, Spinner, SuccessBanner } from "@/components/ui";

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
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
    if (r.success) setSent(r.message ?? "If this account exists, a link has been sent to the registered email.");
    else setError(r.message ?? "Something went wrong. Please try again.");
  }

  return (
    <Modal titleId="fp-title" onClose={onClose}>
      {sent ? (
        <div className="space-y-4">
          <h2 id="fp-title" className="pr-8 text-2xl font-semibold">Check your email</h2>
          <SuccessBanner>{sent}</SuccessBanner>
          <button type="button" onClick={onClose} data-autofocus className={primaryBtn}>Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <h2 id="fp-title" className="pr-8 text-2xl font-semibold">Reset your password</h2>
          <p className="text-sm text-white/80">
            Enter your university email or enrollment number. We&apos;ll send a reset link to the email on record.
          </p>
          <div className="relative">
            <label htmlFor="fp-id" className="sr-only">Email or enrollment number</label>
            <Icon d={ICON_MAIL} />
            <input
              id="fp-id"
              data-autofocus
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
            {busy ? (<><Spinner /> Sending…</>) : "Send reset link"}
          </button>
        </form>
      )}
    </Modal>
  );
}
