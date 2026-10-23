'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep client-side error state recoverable.
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="max-w-sm text-sm text-slate-500">
        {error.message || 'An unexpected error occurred. Your data is safe — please try again.'}
      </p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </main>
  );
}
