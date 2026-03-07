import { Crown, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Candle } from "../data/chartData";
import { generateCandles } from "../data/chartData";
import { formatPrice } from "../data/cryptoData";
import { useAppStore } from "../store/appStore";

const BULL_HEX = "#22c55e";
const BEAR_HEX = "#ef4444";

function IntradayCandlestickChart({
  candles,
  height: _height,
}: {
  candles: Candle[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const { w, h } = dims;
  const padding = { top: 8, right: 8, bottom: 28, left: 58 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxCandles = Math.max(30, Math.floor(chartW / 7));
  const visible = candles.slice(-maxCandles);

  const prices =
    visible.length > 0 ? visible.flatMap((c) => [c.high, c.low]) : [0, 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const toY = (price: number) =>
    padding.top + chartH - ((price - minPrice) / priceRange) * chartH;

  const candleSpacing = visible.length > 0 ? chartW / visible.length : 8;
  const candleWidth = Math.max(1.5, candleSpacing - 2);

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const price = minPrice + (priceRange / (yTickCount - 1)) * i;
    return { price, y: toY(price) };
  });

  const tickFmt = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    if (v >= 1) return `$${v.toFixed(1)}`;
    return `$${v.toPrecision(3)}`;
  };

  const xLabelInterval = Math.max(1, Math.floor(visible.length / 6));

  return (
    <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg
          width={w}
          height={h}
          style={{ display: "block" }}
          role="img"
          aria-label="Intraday candlestick chart"
        >
          <title>Intraday Candlestick Chart</title>
          {/* Grid lines */}
          {yTicks.map(({ y, price }) => (
            <g key={price}>
              <line
                x1={padding.left}
                y1={y}
                x2={w - padding.right}
                y2={y}
                stroke="rgba(100,120,160,0.2)"
                strokeWidth={0.5}
                strokeDasharray="3 5"
              />
              <text
                x={padding.left - 4}
                y={y + 4}
                textAnchor="end"
                fill="#687a9a"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
              >
                {tickFmt(price)}
              </text>
            </g>
          ))}

          {/* Candles */}
          {visible.map((candle, idx) => {
            const isBull = candle.close >= candle.open;
            const fillColor = isBull ? BULL_HEX : BEAR_HEX;
            const cx = padding.left + idx * candleSpacing + candleSpacing / 2;
            const bodyTop = toY(Math.max(candle.open, candle.close));
            const bodyBottom = toY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(1, bodyBottom - bodyTop);
            const wickTop = toY(candle.high);
            const wickBottom = toY(candle.low);
            const xLeft = cx - candleWidth / 2;
            const isLast = idx === visible.length - 1;
            return (
              <g key={candle.time}>
                <line
                  x1={cx}
                  y1={wickTop}
                  x2={cx}
                  y2={wickBottom}
                  stroke={fillColor}
                  strokeWidth={1}
                  opacity={0.75}
                />
                <rect
                  x={xLeft}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={fillColor}
                  fillOpacity={0.85}
                  stroke={fillColor}
                  strokeWidth={0.5}
                  rx={0.5}
                  className={isLast ? "animate-candle-live" : undefined}
                />
              </g>
            );
          })}

          {/* X labels */}
          {visible
            .filter((_, i) => i % xLabelInterval === 0)
            .map((candle) => {
              const idx = visible.indexOf(candle);
              const cx = padding.left + idx * candleSpacing + candleSpacing / 2;
              return (
                <text
                  key={`xt-${candle.time}`}
                  x={cx}
                  y={h - 6}
                  textAnchor="middle"
                  fill="#687a9a"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {candle.time}
                </text>
              );
            })}
        </svg>
      )}
    </div>
  );
}

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "DOGE"] as const;
type Symbol = (typeof SYMBOLS)[number];

interface Trade {
  time: string;
  price: number;
  size: number;
  side: "buy" | "sell";
}

function generateTrades(basePrice: number, count: number): Trade[] {
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const t = new Date(now.getTime() - (count - i) * 2000);
    const change = (Math.random() - 0.48) * 0.002 * basePrice;
    const price = Math.max(basePrice + change, basePrice * 0.99);
    const size = Math.random() * 2 + 0.01;
    const side: "buy" | "sell" = Math.random() > 0.45 ? "buy" : "sell";
    return {
      time: t.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      price,
      size: Number.parseFloat(size.toFixed(4)),
      side,
    };
  });
}

export function IntradayPage() {
  const coins = useAppStore((s) => s.coins);
  const userSubscription = useAppStore((s) => s.userSubscription);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const [symbol, setSymbol] = useState<Symbol>("BTC");
  const [leverage, setLeverage] = useState(1);
  const [amount, setAmount] = useState("100");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");

  const spotCoin = coins.find((c) => c.symbol === symbol);
  const basePrice = spotCoin?.price ?? 67432;

  // Generate 390 1-minute candles
  const [candles, setCandles] = useState(() =>
    generateCandles(basePrice, 390, 1, 0.006),
  );
  const priceRef = useRef(basePrice);

  // Live trades feed
  const [trades, setTrades] = useState<Trade[]>(() =>
    generateTrades(basePrice, 20),
  );

  // Reset on symbol change
  useEffect(() => {
    const newBasePrice =
      coins.find((c) => c.symbol === symbol)?.price ?? basePrice;
    priceRef.current = newBasePrice;
    setCandles(generateCandles(newBasePrice, 390, 1, 0.006));
    setTrades(generateTrades(newBasePrice, 20));
  }, [symbol, coins, basePrice]);

  // Update last candle every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.48) * 0.004 * last.close;
        const newClose = Math.max(last.close + change, last.low * 0.999);
        priceRef.current = newClose;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            close: newClose,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
          },
        ];
      });
      // Add new trade
      setTrades((prev) => {
        const now = new Date();
        const price = priceRef.current * (1 + (Math.random() - 0.5) * 0.001);
        const size = Number.parseFloat((Math.random() * 2 + 0.01).toFixed(4));
        const side: "buy" | "sell" = Math.random() > 0.45 ? "buy" : "sell";
        return [
          {
            time: now.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            price,
            size,
            side,
          },
          ...prev.slice(0, 29),
        ];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Use last 120 candles for intraday chart
  const visibleCandles = useMemo(() => candles.slice(-120), [candles]);

  const currentPrice = candles[candles.length - 1]?.close ?? basePrice;
  const openPrice = candles[0]?.close ?? basePrice;
  const priceChange = ((currentPrice - openPrice) / openPrice) * 100;
  const isUp = priceChange >= 0;
  const lineColor = isUp ? "oklch(0.72 0.18 155)" : "oklch(0.65 0.22 25)";

  // Hot movers
  const movers = useMemo(() => {
    const sorted = [...coins].sort((a, b) => b.change24h - a.change24h);
    return {
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    };
  }, [coins]);

  const estimatedCost = Number.parseFloat(amount || "0") * leverage;

  const handleTrade = useCallback(() => {
    toast.success(
      `${tradeSide.toUpperCase()} ${symbol} — ${leverage}x Leverage`,
      {
        description: `Amount: $${amount} · Cost: $${estimatedCost.toFixed(2)} — Demo order`,
      },
    );
  }, [tradeSide, symbol, leverage, amount, estimatedCost]);

  const showUpgradeBanner =
    userSubscription.plan === "free" ||
    (userSubscription.expiresAt !== null &&
      userSubscription.expiresAt <= Date.now());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Upgrade banner */}
      {showUpgradeBanner && (
        <div
          className="mx-4 mt-3 mb-1 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0"
          style={{
            background: "oklch(0.82 0.16 88 / 0.07)",
            border: "1px solid oklch(0.82 0.16 88 / 0.30)",
          }}
        >
          <div className="flex items-center gap-2.5 flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.82 0.16 88 / 0.15)",
                border: "1px solid oklch(0.82 0.16 88 / 0.4)",
              }}
            >
              <Crown
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.82 0.16 88)" }}
              />
            </div>
            <div>
              <p
                className="text-sm font-mono font-semibold"
                style={{ color: "oklch(0.85 0.008 220)" }}
              >
                Intraday trading requires Standard or Pro plan
              </p>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.55 0.012 225)" }}
              >
                Upgrade to access live 1-minute candle charts with real-time
                signals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePage("subscription")}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 whitespace-nowrap"
            style={{
              background: "oklch(0.82 0.16 88)",
              color: "oklch(0.10 0.005 240)",
              boxShadow: "0 2px 12px oklch(0.82 0.16 88 / 0.35)",
            }}
          >
            Upgrade to Unlock →
          </button>
        </div>
      )}
      {/* Top bar */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid oklch(0.20 0.010 240)" }}
      >
        {/* Symbol selector */}
        <div className="flex gap-1">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className="px-2.5 py-1 text-xs font-mono rounded transition-colors"
              style={
                symbol === s
                  ? {
                      background: "oklch(0.82 0.16 88 / 0.15)",
                      color: "oklch(0.82 0.16 88)",
                      border: "1px solid oklch(0.82 0.16 88 / 0.4)",
                    }
                  : {
                      background: "transparent",
                      color: "oklch(0.55 0.012 225)",
                      border: "1px solid oklch(0.22 0.010 240)",
                    }
              }
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="font-mono font-bold text-lg text-foreground">
              {formatPrice(currentPrice)}
            </span>
          </div>
          <div
            className="font-mono text-sm font-semibold"
            style={{ color: lineColor }}
          >
            {isUp ? "+" : ""}
            {priceChange.toFixed(2)}%
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 ml-auto px-2 py-1 rounded text-xs font-mono"
          style={{
            background: "oklch(0.72 0.18 155 / 0.1)",
            border: "1px solid oklch(0.72 0.18 155 / 0.25)",
            color: "oklch(0.72 0.18 155)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "oklch(0.72 0.18 155)" }}
          />
          LIVE INTRADAY
        </div>
      </div>

      {/* Content — mobile: scrollable column, desktop: fixed side-by-side */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
        {/* Chart panel */}
        <div
          className="p-3 flex flex-col md:flex-1 md:overflow-hidden"
          style={{ height: "clamp(260px, 55vw, 360px)" }}
        >
          <div className="flex-1 overflow-hidden h-full">
            <IntradayCandlestickChart
              candles={visibleCandles}
              height={undefined}
            />
          </div>
        </div>

        {/* Right panel — top border on mobile (stacked), left border on desktop (side by side) */}
        <div
          className="w-full md:w-72 shrink-0 flex flex-col md:overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 border-t md:border-t-0 md:border-l"
          style={{ borderColor: "oklch(0.20 0.010 240)" }}
        >
          {/* Quick trade */}
          <div
            className="p-3 space-y-3"
            style={{ borderBottom: "1px solid oklch(0.20 0.010 240)" }}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Quick Trade
            </div>

            {/* Buy/Sell */}
            <div className="flex gap-1">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTradeSide(s)}
                  className="flex-1 py-1.5 rounded text-xs font-bold font-mono uppercase transition-colors"
                  style={
                    tradeSide === s
                      ? s === "buy"
                        ? {
                            background: "oklch(0.72 0.18 155 / 0.2)",
                            color: "oklch(0.72 0.18 155)",
                            border: "1px solid oklch(0.72 0.18 155 / 0.5)",
                          }
                        : {
                            background: "oklch(0.65 0.22 25 / 0.2)",
                            color: "oklch(0.65 0.22 25)",
                            border: "1px solid oklch(0.65 0.22 25 / 0.5)",
                          }
                      : {
                          background: "oklch(0.18 0.008 235)",
                          color: "oklch(0.55 0.012 225)",
                          border: "1px solid oklch(0.22 0.010 240)",
                        }
                  }
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Order type */}
            <div className="flex gap-1">
              {(["market", "limit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className="flex-1 py-1 rounded text-[11px] font-mono capitalize transition-colors"
                  style={
                    orderType === t
                      ? {
                          background: "oklch(0.82 0.16 88 / 0.12)",
                          color: "oklch(0.82 0.16 88)",
                          border: "1px solid oklch(0.82 0.16 88 / 0.35)",
                        }
                      : {
                          background: "oklch(0.18 0.008 235)",
                          color: "oklch(0.55 0.012 225)",
                          border: "1px solid oklch(0.22 0.010 240)",
                        }
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="intraday-amount"
                className="text-[11px] font-mono text-muted-foreground mb-1 block"
              >
                Amount (USDT)
              </label>
              <input
                id="intraday-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded text-sm font-mono text-foreground outline-none"
                style={{
                  background: "oklch(0.18 0.008 235)",
                  border: "1px solid oklch(0.22 0.010 240)",
                }}
              />
            </div>

            {/* Leverage */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-muted-foreground">Leverage</span>
                <span style={{ color: "oklch(0.82 0.16 88)" }}>
                  {leverage}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={leverage}
                onChange={(e) => setLeverage(Number.parseInt(e.target.value))}
                className="w-full accent-yellow-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-0.5">
                <span>1x</span>
                <span>5x</span>
                <span>10x</span>
              </div>
            </div>

            {/* Est. cost */}
            <div
              className="flex justify-between text-xs font-mono py-1"
              style={{ borderTop: "1px solid oklch(0.22 0.010 240)" }}
            >
              <span className="text-muted-foreground">Est. Cost</span>
              <span
                className="font-semibold"
                style={{ color: "oklch(0.82 0.16 88)" }}
              >
                ${estimatedCost.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTrade}
              className="w-full py-2.5 rounded text-sm font-bold font-mono uppercase transition-all"
              style={
                tradeSide === "buy"
                  ? {
                      background: "oklch(0.72 0.18 155)",
                      color: "oklch(0.07 0.005 155)",
                    }
                  : {
                      background: "oklch(0.65 0.22 25)",
                      color: "oklch(0.97 0.01 25)",
                    }
              }
            >
              {tradeSide === "buy" ? "Buy" : "Sell"} {symbol}
            </button>
          </div>

          {/* Hot movers */}
          <div
            className="p-3"
            style={{ borderBottom: "1px solid oklch(0.20 0.010 240)" }}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Hot Gainers
            </div>
            {movers.gainers.map((c) => (
              <div
                key={c.symbol}
                className="flex items-center justify-between py-1 text-xs font-mono"
              >
                <span className="text-foreground font-semibold">
                  {c.symbol}
                </span>
                <span style={{ color: "oklch(0.72 0.18 155)" }}>
                  +{c.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* Recent trades */}
          <div className="p-3 flex-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Recent Trades
            </div>
            <div className="space-y-0.5">
              {trades.slice(0, 20).map((t, i) => (
                <div
                  key={`${t.time}-${i}`}
                  className="flex items-center gap-2 py-0.5 text-[11px] font-mono"
                >
                  <span className="text-muted-foreground shrink-0">
                    {t.time}
                  </span>
                  <span
                    className="flex-1 font-semibold"
                    style={{
                      color:
                        t.side === "buy"
                          ? "oklch(0.72 0.18 155)"
                          : "oklch(0.65 0.22 25)",
                    }}
                  >
                    {formatPrice(t.price)}
                  </span>
                  <span className="text-muted-foreground">{t.size}</span>
                  {t.side === "buy" ? (
                    <TrendingUp
                      className="w-3 h-3 shrink-0"
                      style={{ color: "oklch(0.72 0.18 155)" }}
                    />
                  ) : (
                    <TrendingDown
                      className="w-3 h-3 shrink-0"
                      style={{ color: "oklch(0.65 0.22 25)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
