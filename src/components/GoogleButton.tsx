"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ERRORS } from "@/lib/errors";

interface GoogleId {
  initialize(cfg: {
    client_id: string;
    callback: (r: { credential: string }) => void;
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
  onSetupRequired: (token: string, name?: string) => void;
}

/** Google's own button. If it can't be used it only affects this area, never the credentials form. */
export default function GoogleButton({ onSuccess, onError, onBusy, onSetupRequired }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  // Keep the latest callbacks without re-initialising Google on every render.
  const cb = useRef({ onSuccess, onError, onBusy, onSetupRequired });
  useEffect(() => {
    cb.current = { onSuccess, onError, onBusy, onSetupRequired };
  });

  // Initialise once Google's script is ready.
  useEffect(() => {
    if (!ready || !CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async ({ credential }) => {
        if (inFlight.current) return; // a second callback can arrive before React re-renders
        inFlight.current = true;
        cb.current.onBusy(true);
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential }),
          });
          const data = await res.json();
          if (data.success) cb.current.onSuccess(data.redirect ?? "/dashboard");
          else if (data.code === "SETUP_REQUIRED" && data.setupToken) cb.current.onSetupRequired(data.setupToken, data.name);
          else cb.current.onError(data.message ?? ERRORS.GOOGLE_FAILED.message);
        } catch {
          cb.current.onError(ERRORS.NETWORK_ERROR.message);
        } finally {
          inFlight.current = false;
          cb.current.onBusy(false);
        }
      },
    });
  }, [ready]);

  // Fit the button to the card (Google needs a pixel width, 200-400) and follow resizes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const measure = () => setWidth(Math.max(200, Math.min(400, Math.floor(el.clientWidth))));
    measure();
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(measure, 150);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!ready || !width || !ref.current || !window.google) return;
    ref.current.replaceChildren();
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width,
      logo_alignment: "left",
    });
  }, [ready, width]);

  // Ad-blocker, offline or CSP: say so after 8 s instead of leaving a blank gap.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setFailed(true), 8000);
    return () => clearTimeout(t);
  }, [ready]);

  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-slate-500">
        Google sign-in is temporarily unavailable. Please use your enrollment number and password.
      </p>
    );
  }
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      {failed && !ready ? (
        <p role="status" className="text-center text-xs text-slate-500">
          Google sign-in couldn&apos;t load. Use your password instead.
        </p>
      ) : (
        <div className="relative min-h-11 w-full">
          {!ready && <div className="skeleton absolute inset-0 h-11 rounded-full" aria-hidden="true" />}
          <div ref={ref} className="flex min-h-11 w-full justify-center" />
        </div>
      )}
    </>
  );
}

