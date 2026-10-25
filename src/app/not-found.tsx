import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="cafe-page flex min-h-screen items-center justify-center p-4">
      <div className="surface w-full max-w-md p-8 text-center">
        <p className="font-mono text-sm font-bold text-pu-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">This page does not exist, or you need to sign in to see it.</p>
        <nav aria-label="Helpful links" className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn-solid-pu">Home / Sign in</Link>
          <Link href="/dining" className="btn-outline-pu">Campus cafes</Link>
          <Link href="/contact" className="btn-outline-pu">Contact</Link>
        </nav>
      </div>
    </main>
  );
}
