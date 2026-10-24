'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { inr } from '@/cafe/lib/money';

export default function CartFab() {
  const { count, subtotal, setDrawerOpen } = useCart();
  if (count === 0) return null;

  return (
    <button
      onClick={() => setDrawerOpen(true)}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2.5 rounded-full border border-white/10 bg-pu-600 px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-pu-900/25 transition-all hover:bg-pu-700 hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100 lg:right-8"
      aria-label={`Open cart (${count} items, subtotal ${inr(subtotal)})`}
    >
      <div className="relative flex items-center justify-center">
        <ShoppingBag size={16} className="text-white" aria-hidden />
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-600 px-1 font-mono text-[9px] font-bold text-white">
          {count}
        </span>
      </div>
      <span className="ml-1 text-pu-50">View Cart</span>
      <span className="text-white/40" aria-hidden>·</span>
      <span className="font-mono font-bold text-white">{inr(subtotal)}</span>
    </button>
  );
}
