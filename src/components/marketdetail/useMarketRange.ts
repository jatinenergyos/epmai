import { useCallback, useEffect, useState } from "react";
import { loadMarketRange, type MarketDetailData } from "./marketDetailData";

/** Week / Month ahead data: every market and exchange for from..to, cached in IndexedDB.
 *  `sync` (Sync DB) re-calls the API and reports whether anything changed. */
export function useMarketRange(from: string, to: string) {
  const [state, setState] = useState<{ key: string; days: Record<string, MarketDetailData> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${from}:${to}`;

  useEffect(() => {
    // Stepping quickly through weeks / months: only the latest range's answer is kept.
    let stale = false;
    setError(null);
    loadMarketRange(from, to)
      .then((r) => { if (!stale) setState({ key, days: r.days }); })
      .catch((e) => { if (!stale) { setState({ key, days: {} }); setError(e instanceof Error ? e.message : String(e)); } });
    return () => { stale = true; };
  }, [from, to, key]);

  const sync = useCallback(async () => {
    const r = await loadMarketRange(from, to, true);
    setState({ key, days: r.days });
    setError(null);
    return r.changed;
  }, [from, to, key]);

  const ready = state?.key === key;
  return { days: ready ? state.days : null, loading: !ready, error, sync };
}
