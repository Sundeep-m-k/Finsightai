import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Quote {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
  prev_close?: number;
}

function c(isLight: boolean, light: string, dark: string) { return isLight ? light : dark; }

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8100';
const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

export function LiveWatchlist() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial snapshot
  useEffect(() => {
    fetch(`${BACKEND_URL}/live/watchlist`)
      .then((r) => r.json())
      .then((data) => { setQuotes(data.quotes || {}); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        ws = new WebSocket(`${WS_URL}/ws/live-stocks`);
        ws.onopen = () => setConnected(true);
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'live_quotes' && data.quotes) setQuotes(data.quotes);
          } catch { /* ignore malformed */ }
        };
        ws.onerror  = () => setConnected(false);
        ws.onclose  = () => { setConnected(false); retryTimer = setTimeout(connect, 4000); };
      } catch {
        retryTimer = setTimeout(connect, 4000);
      }
    }

    connect();
    return () => { ws?.close(); clearTimeout(retryTimer); };
  }, []);

  const entries = Object.entries(quotes).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`rounded-2xl border p-5 ${c(isLight, 'bg-white border-stone-200', 'bg-white/[0.03] border-white/8')}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-display font-black text-lg ${c(isLight, 'text-stone-900', 'text-white')}`}>
          Market Watchlist
        </h2>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          connected
            ? c(isLight, 'bg-emerald-50 text-emerald-600', 'bg-emerald-500/10 text-emerald-400')
            : c(isLight, 'bg-stone-100 text-stone-400', 'bg-white/5 text-slate-500')
        }`}>
          {connected ? '● Live' : '○ Offline'}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className={`text-sm text-center py-6 ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>
          Loading market data…
        </p>
      )}

      {/* Quotes */}
      {!isLoading && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([symbol, quote]) => {
            const change = quote.prev_close ? ((quote.price - quote.prev_close) / quote.prev_close) * 100 : null;
            const isUp   = change !== null && change > 0;
            const isDown = change !== null && change < 0;

            return (
              <div
                key={symbol}
                className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  c(isLight, 'bg-stone-50 border border-stone-100', 'bg-white/[0.03] border border-white/5')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    c(isLight, 'bg-gold-400/15', 'bg-gold-500/10')
                  }`}>
                    {isUp   ? <TrendingUp  size={15} className="text-emerald-500" /> :
                     isDown ? <TrendingDown size={15} className="text-red-400" /> :
                              <Minus        size={15} className={c(isLight, 'text-stone-400', 'text-slate-500')} />}
                  </div>
                  <div>
                    <p className={`font-display font-bold text-sm ${c(isLight, 'text-stone-900', 'text-white')}`}>
                      {symbol}
                    </p>
                    <p className={`text-xs ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>
                      Vol {(quote.volume / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-display font-bold text-sm ${c(isLight, 'text-stone-900', 'text-white')}`}>
                    ${quote.price?.toFixed(2) ?? '—'}
                  </p>
                  {change !== null && (
                    <p className={`text-xs font-semibold ${
                      isUp   ? 'text-emerald-500' :
                      isDown ? 'text-red-400' :
                      c(isLight, 'text-stone-400', 'text-slate-500')
                    }`}>
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className={`text-center py-6 text-sm ${c(isLight, 'text-stone-400', 'text-slate-500')}`}>
          <p>Waiting for live market data…</p>
          <p className="text-xs mt-1 opacity-60">Needs FINNHUB_API_KEY on the backend</p>
        </div>
      )}

      {/* Footer note */}
      <p className={`mt-4 text-xs leading-relaxed ${c(isLight, 'text-stone-400', 'text-white/20')}`}>
        Broad market ETFs (VTI, VOO, SPY) — watchlist only, not a recommendation.
      </p>
    </div>
  );
}
