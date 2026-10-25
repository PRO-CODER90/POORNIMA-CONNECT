import type { Metadata } from "next";
import Link from "next/link";
import CafeCard from "@/cafe/components/CafeCard";
import { listCafesForStudent } from "@/cafe/server/student";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { siteUrl, og } from "@/lib/site";

// Rebuilt at most every 5 minutes, so the open/closed labels stay close to live.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Campus Cafes & Opening Hours",
  description: "See Poornima University's three campus cafes: Chai Point, Food Junction and Fresh Bites. Locations, opening hours and live open status.",
  alternates: { canonical: "/dining" },
  openGraph: og("Campus Cafes & Opening Hours", "/dining"),
};

async function cafes() {
  try {
    return await listCafesForStudent();
  } catch (e) {
    console.error("[dining] could not load cafes", e instanceof Error ? e.message : e);
    return [];
  }
}

export default async function DiningPage() {
  const list = await cafes();
  const base = siteUrl();
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Campus Cafes", href: "/dining" }]} />
      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Campus Cafes</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Three cafes on the Poornima University campus. Students and faculty can order ahead and pay cash at the counter.{" "}
        <Link href="/" className="font-semibold text-pu-600 hover:underline">Sign in to order</Link>.
      </p>

      {list.length === 0 ? (
        <p className="surface mt-8 p-6 text-muted">The cafe list is not available right now. Please check back in a few minutes.</p>
      ) : (
        <section aria-labelledby="cafes-heading" className="mt-8">
          <h2 id="cafes-heading" className="sr-only">Cafes</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c, i) => (
              <CafeCard key={c.id} cafe={c} showDescription href="/" ctaLabel="Sign in to order" priority={i === 0} />
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Cafes follow these hours Monday to Saturday and are closed on Sundays unless the cafe opens specially. Status refreshes every few minutes.</p>
        </section>
      )}

      <p className="mt-8 text-sm text-muted">
        Questions about a cafe or an order? <Link href="/contact" className="font-semibold text-pu-600 hover:underline">Contact the CafeConnect team</Link>.
      </p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": list.map((c) => ({
            "@type": "CafeOrCoffeeShop",
            name: c.name,
            address: `${c.location}, Poornima University`,
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                opens: c.openingTime,
                closes: c.closingTime,
              },
            ],
            parentOrganization: { "@id": `${base}/#org` },
          })),
        }}
      />
    </>
  );
}
