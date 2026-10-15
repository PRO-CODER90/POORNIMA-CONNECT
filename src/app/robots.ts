import type { MetadataRoute } from "next";

// The portal is for signed-in members; keep it out of search results.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
