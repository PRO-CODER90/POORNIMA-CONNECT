'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reliable polling hook — the spec-permitted realtime fallback (§23).
 * Updates without a page refresh; pauses when the tab is hidden.
 */
export function usePolling<T>(fetcher: () => Promise<T>, ms = 5000, active = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fetcher);
  useEffect(() => {
    fnRef.current = fetcher;
  }, [fetcher]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    // First load: `loading` already starts true, so only update state once the data arrives.
    let alive = true;
    fnRef
      .current()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load data.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [active, ms, load]);

  return { data, error, loading, reload: () => load() };
}
