import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  type Candle,
  generateCandles,
  getTimeframeCount,
  getTimeframeInterval,
} from "../data/chartData";
import { formatPrice } from "../data/cryptoData";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const BULL_COLOR = "oklch(0.72 0.18 155)"; // green
const BEAR_COLOR = "oklch(0.65 0.22 25)"; // red
const BULL_HEX = "#22c55e";
const BEAR_HEX = "#ef4444";

interface LiveChartProps {
  basePrice: number;
  symbol: string;
  isPositive: boolean;
  height?: number;
  updateInterval?: number;
}

// Custom SVG candlestick chart rendered directly
function CandlestickSVG({
  candles,
  width,
  height,
}: {
  candles: Candle[];
  width: number;
  height: number;
}) {
  if (!candles.length || width === 0) return null;

  const padding = { top: 12, right: 8, bottom: 28, left: 62 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Visible candles — last N to fit nicely
  const maxCandles = Math.max(30, Math.floor(chartW / 8));
  const visible = candles.slice(-maxCandles);

  if (!visible.length) return null;

  const prices = visible.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const toY = (price: number) =>
    padding.top + chartH - ((price - minPrice) / priceRange) * chartH;

  const candleWidth = Math.max(2, Math.floor(chartW / visible.length) - 2);
  const candleSpacing = chartW / visible.length;

  // Y axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const price = minPrice + (priceRange / (yTickCount - 1)) * i;
    return { price, y: toY(price) };
  });

  const tickFmt = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    if (v >= 1) return `$${v.toFixed(2)}`;
    return `$${v.toPrecision(3)}`;
  };

  // X axis labels — every Nth
  const xLabelInterval = Math.max(1, Math.floor(visible.length / 6));

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block" }}
      aria-label="Candlestick chart"
      role="img"
    >
      <title>Candlestick Chart</title>
      {/* Grid lines */}
      {yTicks.map(({ y, price }) => (
        <g key={price}>
          <line
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="oklch(0.22 0.010 240 / 0.5)"
            strokeWidth={0.5}
            strokeDasharray="3 5"
          />
          <text
            x={padding.left - 4}
            y={y + 4}
            textAnchor="end"
            fill="oklch(0.50 0.010 225)"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
          >
            {tickFmt(price)}
          </text>
        </g>
      ))}

      {/* Candles */}
      {visible.map((candle, i) => {
        const isBull = candle.close >= candle.open;
        const fillColor = isBull ? BULL_HEX : BEAR_HEX;
        const cx = padding.left + i * candleSpacing + candleSpacing / 2;

        const bodyTop = toY(Math.max(candle.open, candle.close));
        const bodyBottom = toY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const wickTop = toY(candle.high);
        const wickBottom = toY(candle.low);

        const xLeft = cx - candleWidth / 2;

        return (
          <g key={candle.time}>
            <line
              x1={cx}
              y1={wickTop}
              x2={cx}
              y2={wickBottom}
              stroke={fillColor}
              strokeWidth={1}
              opacity={0.8}
            />
            <rect
              x={xLeft}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={fillColor}
              fillOpacity={isBull ? 0.9 : 0.85}
              stroke={fillColor}
              strokeWidth={0.5}
              rx={0.5}
              className={
                i === visible.length - 1 ? "animate-candle-live" : undefined
              }
            />
          </g>
        );
      })}

      {/* X axis labels — filtered, no index key */}
      {visible
        .filter((_, i) => i % xLabelInterval === 0)
        .map((candle) => {
          const idx = visible.indexOf(candle);
          const cx = padding.left + idx * candleSpacing + candleSpacing / 2;
          return (
            <text
              key={`xt-${candle.time}`}
              x={cx}
              y={height - 6}
              textAnchor="middle"
              fill="oklch(0.50 0.010 225)"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
            >
              {candle.time}
            </text>
          );
        })}
    </svg>
  );
}

// Responsive wrapper for SVG candlestick
function CandlestickChart({
  candles,
  height,
}: {
  candles: Candle[];
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height }}>
      <CandlestickSVG
        candles={candles}
        width={containerWidth}
        height={height}
      />
    </div>
  );
}

export function LiveChart({
  basePrice,
  symbol,
  isPositive,
  height = 280,
  updateInterval = 5000,
}: LiveChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandles(
      basePrice,
      getTimeframeCount("1H"),
      getTimeframeInterval("1H"),
    ),
  );
  const priceRef = useRef(basePrice);
  const isUp =
    candles.length > 0
      ? candles[candles.length - 1].close >= candles[0].open
      : isPositive;
  const color = isUp ? BULL_COLOR : BEAR_COLOR;

  // Regenerate on timeframe change
  useEffect(() => {
    const count = getTimeframeCount(timeframe);
    const interval = getTimeframeInterval(timeframe);
    setCandles(generateCandles(priceRef.current, count, interval));
  }, [timeframe]);

  // Live update - wiggle last candle
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.48) * 0.003 * last.close;
        const newClose = Math.max(last.close + change, last.low);
        priceRef.current = newClose;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            close: Number.parseFloat(newClose.toFixed(8)),
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
          },
        ];
      });
    }, updateInterval);
    return () => clearInterval(id);
  }, [updateInterval]);

  const volumeData = useMemo(
    () =>
      candles.slice(-60).map((c) => ({
        time: c.time,
        volume: c.volume,
        isBull: c.close >= c.open,
      })),
    [candles],
  );

  const currentPrice = candles[candles.length - 1]?.close ?? basePrice;
  const priceChange =
    candles.length > 1
      ? ((currentPrice - candles[0].open) / candles[0].open) * 100
      : 0;

  return (
    <div className="w-full">
      {/* Timeframe selector + price */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className="px-2.5 py-1 text-xs font-mono rounded transition-colors"
            style={
              timeframe === tf
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
            {tf}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-mono font-bold"
              style={{ color: "oklch(0.92 0.008 220)" }}
            >
              {formatPrice(currentPrice)}
            </span>
            <span className="text-xs font-mono" style={{ color }}>
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: color }}
            />
            <span className="text-xs font-mono" style={{ color }}>
              LIVE {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Candlestick chart */}
      <CandlestickChart candles={candles} height={Math.floor(height * 0.8)} />

      {/* Volume bars */}
      <div style={{ height: Math.floor(height * 0.18), marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={volumeData}
            margin={{ top: 0, right: 8, left: 62, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="oklch(0.22 0.010 240 / 0.4)"
              vertical={false}
            />
            <Bar
              dataKey="volume"
              isAnimationActive={false}
              {...{
                shape: (props: {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  isBull?: boolean;
                }) => {
                  const {
                    x = 0,
                    y = 0,
                    width = 0,
                    height: h = 0,
                    isBull,
                  } = props;
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={h}
                      fill={isBull ? `${BULL_HEX}60` : `${BEAR_HEX}60`}
                      rx={1}
                    />
                  );
                },
              }}
            />
            <Tooltip
              content={() => null}
              cursor={{ fill: "oklch(0.22 0.010 240 / 0.3)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
