import Link from "next/link";

const LINKS = [
  { href: "/dining", label: "Campus Cafes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  return (
    <header className="border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-ink" aria-label="PU CafeConnect home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pu-900 font-serif text-sm text-white" aria-hidden>PU</span>
          <span>PU CafeConnect</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 font-medium text-ink/80 hover:bg-pu-50 hover:text-pu-700">
              {l.label}
            </Link>
          ))}
          <Link href="/" className="btn-solid-pu ml-1">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
