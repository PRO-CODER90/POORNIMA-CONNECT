"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parseContact, SUBJECTS } from "@/lib/contact-schema";

type Fields = { name: string; email: string; subject: string; message: string; consent: boolean };
const ORDER: (keyof Fields)[] = ["name", "email", "subject", "message", "consent"];

export default function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [f, setF] = useState<Fields>({ name: "", email: "", subject: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string; email: string } | null>(null);
  const [startedAt] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));
  const focusFirst = (errs: Record<string, string>) => {
    const k = ORDER.find((x) => errs[x]);
    if (k) formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`)?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const check = parseContact(f);
    if (!check.ok) {
      setErrors(check.errors);
      setFormError("Please fix the highlighted fields.");
      return focusFirst(check.errors);
    }
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, website: honeypot.current?.value ?? "", ts: startedAt }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.fields) {
          setErrors(d.fields);
          focusFirst(d.fields);
        }
        setFormError(d.error ?? d.message ?? "Could not send your message. Please try again.");
        return;
      }
      setDone({ reference: d.reference, email: f.email });
    } catch {
      setFormError(`Network error. Your text is still here; try again, or email ${supportEmail}.`);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="surface p-6" role="status" aria-live="polite">
        <h2 className="text-lg font-bold text-ink">Message sent</h2>
        <p className="mt-2 text-ink/80">
          Thanks, we&apos;ll reply to <strong>{done.email}</strong> within 2 working days. Your reference is <strong className="font-mono">{done.reference}</strong>.
        </p>
      </div>
    );
  }

  const field = (k: keyof Fields) => ({
    id: `cf-${k}`,
    name: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `cf-${k}-err` : undefined,
  });
  const err = (k: string) => (errors[k] ? <p id={`cf-${k}-err`} className="mt-1 text-xs font-medium text-rose-600">{errors[k]}</p> : null);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="surface space-y-4 p-5 sm:p-6">
      <div aria-live="polite">{formError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-name">Your name</label>
          <input {...field("name")} className="input-pu" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
          {err("name")}
        </div>
        <div>
          <label className="label" htmlFor="cf-email">Email</label>
          <input {...field("email")} type="email" className="input-pu" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={254} />
          {err("email")}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cf-subject">Subject</label>
        <select {...field("subject")} className="input-pu" value={f.subject} onChange={(e) => set("subject", e.target.value)}>
          <option value="">Choose…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {err("subject")}
      </div>
      <div>
        <label className="label" htmlFor="cf-message">
          Message <span className="font-normal normal-case text-slate-400">({f.message.length}/2000)</span>
        </label>
        <textarea {...field("message")} className="input-pu min-h-36" value={f.message} onChange={(e) => set("message", e.target.value)} maxLength={2000} />
        {err("message")}
      </div>
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="cf-website">Website</label>
        <input ref={honeypot} id="cf-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm text-ink/80">
          <input {...field("consent")} type="checkbox" className="mt-1 accent-pu-600" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
          <span>
            I agree to the <Link href="/privacy" className="text-pu-600 underline">Privacy Policy</Link>; my message and email are stored to answer me.
          </span>
        </label>
        {err("consent")}
      </div>
      <button type="submit" className="btn-solid-pu py-2.5" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
