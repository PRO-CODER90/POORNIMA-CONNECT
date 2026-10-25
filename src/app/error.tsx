"use client";

import { useEffect } from "react";
import Link from "next/link";

// Never show error.message: it can contain SQL errors or file paths. The real error is logged
// on the server; visitors only get a reference code they can quote to support.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "");
  }, [error]);

  return (
    <main className="cafe-page flex min-h-screen items-center justify-center p-4">
      <div className="surface w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Something went wrong. Please try again.</p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-slate-500">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn-solid-pu">Try again</button>
          <Link href="/" className="btn-outline-pu">Home</Link>
          <Link href="/dining" className="btn-outline-pu">Campus cafes</Link>
        </div>
      </div>
    </main>
  );
}
