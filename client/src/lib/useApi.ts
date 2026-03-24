import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> { data: T; ts: number; }
const cache = new Map<string, CacheEntry<any>>();
const STALE = 30000; // 30s
const GC = 300000; // 5min

export function useApi<T>(key: string, fetcher: () => Promise<T>, opts?: { enabled?: boolean; staleTime?: number; onSuccess?: (d: T) => void }) {
  const [data, setData] = useState<T | null>(() => {
    const c = cache.get(key);
    return c ? c.data : null;
  });
  const [loading, setLoading] = useState(!cache.has(key));
  const [error, setError] = useState<string | null>(null);
  const enabled = opts?.enabled !== false;
  const stale = opts?.staleTime ?? STALE;
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        cache.set(key, { data: result, ts: Date.now() });
        opts?.onSuccess?.(result);
      }
    } catch (e: any) {
      if (mountedRef.current) setError(e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [key, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    const c = cache.get(key);
    if (c && Date.now() - c.ts < stale) {
      setData(c.data); setLoading(false);
      return;
    }
    refetch();
    return () => { mountedRef.current = false; };
  }, [key, enabled]);

  // Garbage collect old entries
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      cache.forEach((v, k) => { if (now - v.ts > GC) cache.delete(k); });
    }, GC);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, refetch, setData };
}

export function invalidateCache(prefix?: string) {
  if (prefix) {
    cache.forEach((_, k) => { if (k.startsWith(prefix)) cache.delete(k); });
  } else {
    cache.clear();
  }
}
