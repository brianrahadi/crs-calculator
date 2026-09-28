import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DrawsData } from './aggregator';
import { isFresh, loadLive, loadStale, summarize } from './aggregator';

/**
 * Stale-while-revalidate: render the cached/bundled rounds immediately,
 * then replace them with IRCC's live feed when it arrives.
 */
export function useDraws() {
  const [data, setData] = useState<DrawsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    loadLive()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadStale()
      .then((d) => {
        if (cancelled) return;
        setData((cur) => cur ?? d);
        if (isFresh(d)) setLoading(false);
        else refresh();
      })
      .catch(() => !cancelled && refresh());
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const summaries = useMemo(() => (data ? summarize(data.draws) : []), [data]);
  return { data, summaries, error, loading, refresh };
}

export type DrawsState = ReturnType<typeof useDraws>;
