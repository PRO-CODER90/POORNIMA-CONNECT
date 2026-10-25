"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const KEY = "pucc-analytics-consent"; // "granted" | "denied"
const OPEN_EVENT = "pucc:cookie-settings";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function write(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

/**
 * Cookie banner + Google Analytics. Public pages only; analytics stays off until "Accept", and the
 * page URL sent to Google never includes the query string (one-time setup/reset tokens live there).
 */
export default function CookieConsent() {
  const [choice, setChoice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = read();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only state, read after hydration
    setChoice(c);
    setOpen(!c && !!GA_ID);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const decide = (v: "granted" | "denied") => {
    write(v);
    setChoice(v);
    setOpen(false);
    if (v === "denied" && choice === "granted") window.location.reload(); // unload GA already running
  };

  const tokenInUrl = typeof window !== "undefined" && /[?&](setup|reset)=/.test(window.location.search);

  return (
    <>
      {GA_ID && choice === "granted" && !tokenInUrl ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
          <Script id="ga" strategy="lazyOnload">{`
            window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
            gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
            gtag('js',new Date());
            gtag('config',${JSON.stringify(GA_ID)},{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
            gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title});
          `}</Script>
        </>
      ) : null}
      {open ? (
        <div role="dialog" aria-label="Cookie settings" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
          <div className="surface mx-auto flex max-w-3xl flex-col gap-3 p-4 text-sm text-ink sm:flex-row sm:items-center">
            <p className="flex-1">
              We use one necessary cookie to keep you signed in. With your OK we also use Google Analytics on these public pages to see which pages
              are visited, with no names or enrollment numbers. <a href="/privacy#cookies" className="text-pu-600 underline">Privacy Policy</a>
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-outline-pu" onClick={() => decide("denied")}>Reject</button>
              <button type="button" className="btn-solid-pu" onClick={() => decide("granted")}>Accept analytics</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  if (!GA_ID) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}
