import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import ContactForm from "@/components/contact/ContactForm";
import { abs, SUPPORT_EMAIL, og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & Support",
  description: "Contact the PU CafeConnect team for order issues, account help or feedback. Send us a message and we reply by email.",
  alternates: { canonical: "/contact" },
  openGraph: og("Contact & Support", "/contact"),
};

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact", href: "/contact" }]} />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Contact &amp; Support</h1>
      <p className="mt-2 max-w-2xl text-muted">Order problem, trouble signing in, or an idea for the cafes? Send us a message and we&apos;ll reply by email.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <ContactForm supportEmail={SUPPORT_EMAIL} />
          <noscript>
            <p className="mt-3 text-sm text-muted">The form needs JavaScript. You can also email <a className="text-pu-600 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          </noscript>
        </div>
        <aside className="surface h-fit space-y-3 p-5 text-sm text-ink/80">
          <h2 className="text-base font-bold text-ink">Other ways to reach us</h2>
          <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pu-600 underline">{SUPPORT_EMAIL}</a></p>
          <p>For a problem with an order in progress, speak to the staff at the cafe counter. Cafe locations and hours are on the <Link href="/dining" className="text-pu-600 underline">Campus Cafes</Link> page.</p>
          <p>How we use what you send: <Link href="/privacy" className="text-pu-600 underline">Privacy Policy</Link>.</p>
        </aside>
      </div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact & Support", url: abs("/contact") }} />
    </>
  );
}
