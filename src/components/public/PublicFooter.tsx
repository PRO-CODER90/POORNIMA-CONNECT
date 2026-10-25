import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site";
import { CookieSettingsLink } from "./CookieConsent";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dining", label: "Campus Cafes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
];

export function PublicFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const text = tone === "dark" ? "text-white/80" : "text-muted";
  const link = tone === "dark" ? "text-white hover:underline" : "text-ink/80 hover:text-pu-700";
  return (
    <footer className={`text-sm ${text}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={link}>{l.label}</Link>
              </li>
            ))}
            <li>
              <CookieSettingsLink className={link} />
            </li>
          </ul>
        </nav>
        <p>
          Help: <a href={`mailto:${SUPPORT_EMAIL}`} className={`${link} underline underline-offset-2`}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </footer>
  );
}
