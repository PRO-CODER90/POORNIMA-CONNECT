import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, abs } from "@/lib/site";

/** Public pages only: no signed-in areas, tokens or query strings. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: abs(p.path),
    lastModified: new Date(`${p.lastModified}T00:00:00+05:30`),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
