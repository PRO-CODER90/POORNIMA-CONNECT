import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <div className="text-6xl">🍽️</div>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist or you do not have access to it.
      </p>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </main>
  );
}
