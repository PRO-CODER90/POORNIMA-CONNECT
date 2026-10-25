import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import CookieConsent from "@/components/public/CookieConsent";

/** Header, footer and the analytics consent banner for the public (indexable) pages. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cafe-page flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <div className="border-t border-white/70 bg-white/60">
        <PublicFooter />
      </div>
      <CookieConsent />
    </div>
  );
}
