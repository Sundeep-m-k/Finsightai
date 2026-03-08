import { useEffect, useState } from 'react';

// Module-level cache so repeated renders don't re-fetch
const cache = new Map<string, { rates: Record<string, number>; at: number }>();
const TTL = 10 * 60_000; // 10 minutes

export interface RateResult {
  rate: number | null;
  loading: boolean;
  error: boolean;
  updatedAt: Date | null;
}

export function useLiveRate(base: string, target: string | null): RateResult {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!target) { setRate(null); setUpdatedAt(null); return; }
    if (base === target) { setRate(1); setUpdatedAt(new Date()); return; }

    const hit = cache.get(base);
    if (hit && Date.now() - hit.at < TTL) {
      setRate(hit.rates[target] ?? null);
      setUpdatedAt(new Date(hit.at));
      return;
    }

    setLoading(true);
    setError(false);
    fetch(`https://open.er-api.com/v6/latest/${base}`)
      .then(r => r.json())
      .then((d: { rates: Record<string, number> }) => {
        const entry = { rates: d.rates, at: Date.now() };
        cache.set(base, entry);
        setRate(d.rates[target] ?? null);
        setUpdatedAt(new Date(entry.at));
      })
      .catch(() => { setError(true); setRate(null); })
      .finally(() => setLoading(false));
  }, [base, target]);

  return { rate, loading, error, updatedAt };
}
