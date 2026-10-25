import Image from 'next/image';
import { demoImageFor } from '@/cafe/lib/stock';

const SIZES = {
  thumb: '48px',
  card: '(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw',
  hero: '(min-width:640px) 512px, 100vw',
} as const;

/**
 * The one place product pictures are drawn. Falls back to the category's demo image, so a product
 * never shows an emoji or an empty box. Needs a sized, `relative` parent (it uses `fill`).
 */
export default function ProductImage({
  src,
  name,
  categoryName,
  itemType,
  size = 'card',
  decorative = false,
  dimmed = false,
  priority = false,
}: {
  src?: string | null;
  name: string;
  categoryName?: string | null;
  itemType?: string | null;
  size?: keyof typeof SIZES;
  /** Thumbnails next to the visible name: empty alt so screen readers don't hear it twice. */
  decorative?: boolean;
  dimmed?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={src || demoImageFor(categoryName, itemType)}
      alt={decorative ? '' : name}
      fill
      sizes={SIZES[size]}
      priority={priority}
      className={`object-cover ${dimmed ? 'opacity-70 grayscale' : ''}`}
    />
  );
}

/** Small square thumbnail with its own frame (cart, orders, tables). */
export function ProductThumb({ src, name, className = 'h-11 w-11' }: { src?: string | null; name: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-100 ${className}`}>
      <ProductImage src={src} name={name} size="thumb" decorative />
    </div>
  );
}
