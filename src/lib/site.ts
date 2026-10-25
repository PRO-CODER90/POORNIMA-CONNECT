// Public-site facts in one place. Anything the university has not confirmed comes from env and is
// simply left out when unset, so no invented address, phone or social link is ever published.
import { appUrl } from "@/lib/mail";

export const SITE_NAME = "PU CafeConnect";
export const ORG_NAME = "Poornima University";
/** Same address the sign-in card already shows; override with NEXT_PUBLIC_SUPPORT_EMAIL. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@poornima.edu.in";
/** The university's own website, if confirmed (ORG_URL). */
export const ORG_URL = process.env.ORG_URL?.trim() || null;

/** Absolute site origin for canonical URLs, sitemap and structured data. */
export function siteUrl(): string {
  return appUrl();
}

export const abs = (path: string) => `${siteUrl()}${path === "/" ? "/" : path}`;

/** Public pages, with a fixed "last changed" date each (bump it when the page really changes). */
export const PUBLIC_PAGES = [
  { path: "/", label: "Home", lastModified: "2026-10-25", changeFrequency: "monthly", priority: 1.0 },
  { path: "/dining", label: "Campus Cafes", lastModified: "2026-10-25", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", label: "About", lastModified: "2026-10-25", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", label: "Contact", lastModified: "2026-10-25", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacy", label: "Privacy Policy", lastModified: "2026-10-25", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", label: "Terms of Use", lastModified: "2026-10-25", changeFrequency: "yearly", priority: 0.3 },
] as const;

/** Organization + WebSite graph for "/" and "/about". */
export function orgGraph() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollegeOrUniversity",
        "@id": `${base}/#org`,
        name: ORG_NAME,
        ...(ORG_URL ? { url: ORG_URL } : {}),
        logo: `${base}/icon`,
        address: { "@type": "PostalAddress", addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL, availableLanguage: ["en", "hi"] },
      },
      { "@type": "WebSite", "@id": `${base}/#website`, name: SITE_NAME, url: `${base}/`, publisher: { "@id": `${base}/#org` }, inLanguage: "en-IN" },
    ],
  };
}

/** Per-page Open Graph data. A page that sets its own openGraph replaces the parent's, so the site image is added back here. */
export function og(title: string, url: string) {
  return { title, url, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PU CafeConnect, Poornima University campus dining" }] };
}
