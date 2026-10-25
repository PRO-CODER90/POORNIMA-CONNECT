import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// A crawl hint only: private areas are protected by sign-in and noindex headers, not by this file.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // Preview and staging deployments stay out of search entirely.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dining", "/about", "/contact", "/privacy", "/terms"],
        disallow: ["/api/", "/admin", "/staff", "/student", "/cafe/", "/dashboard"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
