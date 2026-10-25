'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl: string;
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
  /** Latest packet stock from the menu's poll; the saved cart is never trusted for stock. */
  stock: StockMap;
  applyStock: (s: StockMap) => void;
  /** Most a line can hold right now (99, or the packet's remaining quantity). */
  maxFor: (menuItemId: string) => number;
  /** Ask the menu to poll stock now (drawer opened, order failed). */
  refreshStock: () => void;
  setStockRefresher: (fn: (() => void) | null) => void;
}

export type StockMap = Record<string, { state: string; qty: number | null; available: boolean }>;

const Ctx = createContext<CartCtx | null>(null);
const LS_KEY = 'pucc-cart-v2'; // v2: images instead of emoji

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stock, setStock] = useState<StockMap>({});
  const refresher = useRef<(() => void) | null>(null);

  const maxFor = useCallback(
    (id: string) => {
      const s = stock[id];
      return s && s.qty !== null ? Math.max(0, Math.min(99, s.qty)) : 99;
    },
    [stock],
  );

  const refreshStock = useCallback(() => refresher.current?.(), []);
  const setStockRefresher = useCallback((fn: (() => void) | null) => {
    refresher.current = fn;
  }, []);

  // New stock arrived: clamp lines to what is left. Sold-out lines stay (shown as unavailable) until removed.
  const applyStock = useCallback((next: StockMap) => {
    setStock(next);
    setItems((prev) => {
      let changed = false;
      const out = prev.map((i) => {
        const s = next[i.menuItemId];
        if (s && s.qty !== null && s.qty > 0 && i.quantity > s.qty) {
          changed = true;
          return { ...i, quantity: s.qty };
        }
        return i;
      });
      return changed ? out : prev;
    });
  }, []);

  // The saved cart lives in browser storage, which only exists after hydration, so it has to be
  // restored in an effect (reading it during render would make server and client HTML differ).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.menuItemId && i.cafeId && i.imageUrl));
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
            return prev.map((i) => (i.menuItemId === item.menuItemId ? { ...i, quantity: Math.min(maxFor(i.menuItemId), i.quantity + qty) } : i));
          }
          const q = Math.min(maxFor(item.menuItemId), qty);
          return q > 0 ? [...prev, { ...item, quantity: q }] : prev;
        });
      },
      setQty: (menuItemId, qty) => {
        setItems((prev) =>
          qty <= 0 ? prev.filter((i) => i.menuItemId !== menuItemId) : prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: Math.min(Math.max(1, maxFor(menuItemId)), qty) } : i)),
        );
      },
      removeItem: (menuItemId) => setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId)),
      clear: () => setItems([]),
      cafeId,
      stock,
      applyStock,
      maxFor,
      refreshStock,
      setStockRefresher,
    };
  }, [items, drawerOpen, stock, applyStock, maxFor, refreshStock, setStockRefresher]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
