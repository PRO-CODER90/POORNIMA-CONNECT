"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ERRORS } from "@/lib/errors";

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

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface Props {
  onSuccess: (redirect: string) => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}

/** Google's own button. If it can't be used it only affects this area, never the credentials form. */
export default function GoogleButton({ onSuccess, onError, onBusy }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Keep the latest callbacks without re-initialising Google on every render.
  const cb = useRef({ onSuccess, onError, onBusy });
  useEffect(() => {
    cb.current = { onSuccess, onError, onBusy };
  });

  useEffect(() => {
    if (!ready || !CLIENT_ID || !ref.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      hd: "poornima.edu.in", // UI hint only; the server enforces the domain
      callback: async ({ credential }) => {
        cb.current.onBusy(true);
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential }),
          });
          const data = await res.json();
          if (data.success) cb.current.onSuccess(data.redirect ?? "/dashboard");
          else cb.current.onError(data.message ?? ERRORS.GOOGLE_FAILED.message);
        } catch {
          cb.current.onError(ERRORS.NETWORK_ERROR.message);
        } finally {
          cb.current.onBusy(false);
        }
      },
    });
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
      logo_alignment: "left",
    });
  }, [ready]);

  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-white/70">
        Google sign-in is temporarily unavailable. Please use your enrollment number and passcode.
      </p>
    );
  }
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => cb.current.onError(ERRORS.GOOGLE_FAILED.message)}
      />
      <div ref={ref} className="flex min-h-11 justify-center" />
    </>
  );
}

