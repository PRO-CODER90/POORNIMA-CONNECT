import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { abs } from "@/lib/site";

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Visible breadcrumb trail plus matching BreadcrumbList data. The last crumb is the current page
 * (plain text, aria-current). Pass `schema={false}` on private pages.
 */
export function Breadcrumbs({ items, schema = true }: { items: Crumb[]; schema?: boolean }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.href} className="flex items-center">
                {i > 0 ? <span aria-hidden className="mx-2 text-slate-400">›</span> : null}
                {last ? (
                  <span aria-current="page" className="font-medium text-ink">{c.label}</span>
                ) : (
                  <Link href={c.href} className="text-pu-600 hover:underline">{c.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {schema ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: abs(c.href) })),
          }}
        />
      ) : null}
    </>
  );
}
