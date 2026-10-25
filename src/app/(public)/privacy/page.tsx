import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { SUPPORT_EMAIL, og } from "@/lib/site";
import { DraftNote, Prose } from "../prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PU CafeConnect collects, uses and protects your personal data, how long it is kept, and the choices and rights you have.",
  alternates: { canonical: "/privacy" },
  openGraph: og("Privacy Policy", "/privacy"),
};

const SECTIONS = [
  ["who", "Who we are"],
  ["collect", "What we collect"],
  ["why", "Why we use it"],
  ["cookies", "Cookies"],
  ["share", "Who we share it with"],
  ["retention", "How long we keep it"],
  ["security", "How we protect it"],
  ["rights", "Your rights"],
  ["changes", "Changes"],
] as const;

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy", href: "/privacy" }]} />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 25 October 2026</p>
      <DraftNote />
      <Prose>
        <nav aria-label="On this page">
          <ul>
            {SECTIONS.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ul>
        </nav>

        <h2 id="who">Who we are</h2>
        <p>
          PU CafeConnect is the campus dining service of Poornima University, Jaipur, which is responsible for your personal data here. Contact:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2 id="collect">What we collect</h2>
        <ul>
          <li><strong>Account:</strong> name, enrollment number or staff ID, university email, role, and your password stored only as a salted bcrypt hash. If you use Google sign-in, the email of that Google account.</li>
          <li><strong>Profile:</strong> department, course, year and, if you add it, a phone number.</li>
          <li><strong>Orders:</strong> what you ordered, from which cafe, amounts, cash payment status, order status, times and the notifications we send you.</li>
          <li><strong>Security:</strong> sign-in attempts, IP address, browser details and an audit log of actions, to stop misuse and lock accounts after repeated wrong passwords.</li>
          <li><strong>Contact form:</strong> your name, email, subject and message.</li>
          <li><strong>Analytics (only if you accept):</strong> pages visited on the public pages and basic device and browser information. No names, enrollment numbers or order details.</li>
        </ul>

        <h2 id="why">Why we use it</h2>
        <p>To run the dining service (taking and tracking orders, recording cash payments), to keep accounts secure, to answer your messages, and to improve the public pages. Analytics runs only with your consent.</p>

        <h2 id="cookies">Cookies</h2>
        <ul>
          <li>A strictly necessary session cookie keeps you signed in. It is HTTP-only and expires after one hour.</li>
          <li>Google Analytics cookies are set only on the public pages and only after you choose &ldquo;Accept analytics&rdquo;. You can change your choice with &ldquo;Cookie settings&rdquo; in the footer.</li>
          <li>We do not use advertising cookies.</li>
        </ul>

        <h2 id="share">Who we share it with</h2>
        <p>Only the providers that run the service for us: website hosting, the database provider, the email provider, and Google (for Google sign-in, and for analytics if you accept). We do not sell your data.</p>

        <h2 id="retention">How long we keep it</h2>
        <ul>
          <li>Sign-in records: 90 days. Lockout counters: 7 days.</li>
          <li>Contact messages: 12 months.</li>
          <li>Orders and payment records: kept for the university&apos;s records; the exact period will be confirmed by the university.</li>
          <li>Analytics data: 2 months.</li>
        </ul>

        <h2 id="security">How we protect it</h2>
        <p>Connections are encrypted (HTTPS), passwords are hashed, each role sees only what it needs (students their own orders, cafe staff their own cafe), and accounts lock after repeated wrong passwords.</p>

        <h2 id="rights">Your rights</h2>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, 2023 you can ask to see, correct or delete your data, withdraw consent, and raise a grievance. Send requests
          through the <Link href="/contact">contact form</Link> or to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. The service is meant for members of the university.
        </p>

        <h2 id="changes">Changes</h2>
        <p>We will update this page when our practices change and show the new date at the top.</p>
      </Prose>
    </>
  );
}
