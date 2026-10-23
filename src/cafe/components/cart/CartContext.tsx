'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
  cafeId: string;
  cafeName: string;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (menuItemId: string, qty: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  cafeId: string | null; // single-cafe cart
}

const Ctx = createContext<CartCtx | null>(null);
const LS_KEY = 'pucc-cart-v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // The saved cart lives in browser storage, which only exists after hydration, so it has to be
  // restored in an effect (reading it during render would make server and client HTML differ).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.menuItemId && i.cafeId));
      }
    } catch {
      /* corrupt cart — start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      /* storage full/blocked — cart stays in memory */
    }
  }, [items, loaded]);

  const value = useMemo<CartCtx>(() => {
    const cafeId = items.length ? items[0].cafeId : null;
    return {
      items,
      count: items.reduce((a, b) => a + b.quantity, 0),
      subtotal: items.reduce((a, b) => a + b.price * b.quantity, 0),
      drawerOpen,
      setDrawerOpen,
      addItem: (item, qty = 1) => {
        setItems((prev) => {
          if (prev.length && prev[0].cafeId !== item.cafeId) return prev; // one cafe per cart
          const existing = prev.find((i) => i.menuItemId === item.menuItemId);
          if (existing) {
            return prev.map((i) => (i.menuItemId === item.menuItemId ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i));
          }
          return [...prev, { ...item, quantity: Math.min(99, qty) }];
        });
      },
      setQty: (menuItemId, qty) => {
        setItems((prev) =>
          qty <= 0 ? prev.filter((i) => i.menuItemId !== menuItemId) : prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: Math.min(99, qty) } : i)),
        );
      },
      removeItem: (menuItemId) => setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId)),
      clear: () => setItems([]),
      cafeId,
    };
  }, [items, drawerOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
