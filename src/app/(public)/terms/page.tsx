import type { Metadata } from "next";
import { og } from "@/lib/site";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { DraftNote, Prose } from "../prose";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using PU CafeConnect, including ordering, cash payment at the counter, cancellations and keeping your account safe.",
  alternates: { canonical: "/terms" },
  openGraph: og("Terms of Use", "/terms"),
};

export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms of Use", href: "/terms" }]} />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 25 October 2026</p>
      <DraftNote />
      <Prose>
        <h2>Who can use it</h2>
        <p>PU CafeConnect is for Poornima University students, faculty and cafe staff with an account issued by the university.</p>
        <h2>Ordering and payment</h2>
        <ul>
          <li>Orders are paid in cash at the cafe counter when you collect them.</li>
          <li>The price you pay is the price shown when you placed the order.</li>
          <li>Please collect what you order. Repeatedly leaving orders uncollected may lead to your ordering being limited.</li>
        </ul>
        <h2>Cancellations</h2>
        <p>You can cancel an order yourself until the cafe accepts it. After that, speak to the cafe staff.</p>
        <h2>Your account</h2>
        <ul>
          <li>Keep your password private and do not let others order with your account.</li>
          <li>Do not try to get into other accounts, change prices or disrupt the service.</li>
        </ul>
        <h2>Privacy</h2>
        <p>How we handle your data is explained in the <Link href="/privacy">Privacy Policy</Link>. Questions: <Link href="/contact">contact us</Link>.</p>
      </Prose>
    </>
  );
}
