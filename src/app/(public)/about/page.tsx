import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { orgGraph, SUPPORT_EMAIL, og } from "@/lib/site";
import { Prose } from "../prose";

export const metadata: Metadata = {
  title: "About PU CafeConnect",
  description: "How PU CafeConnect lets Poornima University students and faculty order from campus cafes and pay cash on pickup.",
  alternates: { canonical: "/about" },
  openGraph: og("About PU CafeConnect", "/about"),
};

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }]} />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">About PU CafeConnect</h1>
      <Prose>
        <p>
          PU CafeConnect is the campus dining service of Poornima University. Students and faculty use it to see what the{" "}
          <Link href="/dining">campus cafes</Link> are serving, order ahead and pick up at the counter.
        </p>
        <h2>How ordering works</h2>
        <ul>
          <li>Sign in with your enrollment number (or staff ID) and password, or with your university Google account.</li>
          <li>Pick a cafe, add items to your cart and place the order. Prices are always checked by the server.</li>
          <li>Follow your order as the cafe accepts it, prepares it and marks it ready.</li>
          <li>Pay in cash at the counter when you collect it. There is no online payment.</li>
          <li>You can cancel an order until the cafe accepts it.</li>
          <li>Packet items such as chips or bottled water show how many are left, so you know before you order.</li>
        </ul>
        <h2>Opening hours</h2>
        <p>
          Each cafe has its own hours, shown on the <Link href="/dining">Campus Cafes</Link> page. Cafes are closed on Sundays unless they open specially.
        </p>
        <h2 id="security">Reporting a security problem</h2>
        <p>
          If you find a security weakness in PU CafeConnect, please email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the details and do not
          access other people&apos;s data or disrupt the service while testing. We will reply and keep you updated while we fix it.
        </p>
        <h2>Help</h2>
        <p>
          For order problems, account help or feedback, use the <Link href="/contact">contact form</Link>.
        </p>
      </Prose>
      <JsonLd data={orgGraph()} />
    </>
  );
}
