"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { MarketPrice } from "@/lib/api";
import Card from "./ui/Card";

export type PriceRange = "30D" | "60D" | "90D";

interface DayRow {
  date: string;
  smallMin: number | null;
  smallMax: number | null;
  smallRange: number | null;
  medMin: number | null;
  medMax: number | null;
  medRange: number | null;
  largeMin: number | null;
  largeMax: number | null;
  largeRange: number | null;
}

const PRODUCTS: Record<number, "small" | "med" | "large"> = {
  216: "small",
  206: "med",
  182: "large",
};
const RANGES: PriceRange[] = ["30D", "60D", "90D"];
const AXIS_STYLE = {
  fontSize: 10,
  fill: "var(--text-muted)",
  fontFamily: "var(--font-dm-mono, monospace)",
};

function buildRows(prices: MarketPrice[]): DayRow[] {
  const map = new Map<string, DayRow>();
  for (const p of prices) {
    const key = p.record_date.slice(0, 10);
    if (!map.has(key))
      map.set(key, {
        date: key,
        smallMin: null,
        smallMax: null,
        medMin: null,
        medMax: null,
        largeMin: null,
        largeMax: null,
      });
    const row = map.get(key)!;
    const g = PRODUCTS[p.product_id];
    if (!g) continue;
    if (p.price_min !== null)
      (row as unknown as Record<string, number | null>)[`${g}Min`] =
        +p.price_min;
    if (p.price_max !== null)
      (row as unknown as Record<string, number | null>)[`${g}Max`] =
        +p.price_max;
  }
  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      smallRange:
        r.smallMax !== null && r.smallMin !== null
          ? r.smallMax - r.smallMin
          : null,
      medRange:
        r.medMax !== null && r.medMin !== null ? r.medMax - r.medMin : null,
      largeRange:
        r.largeMax !== null && r.largeMin !== null
          ? r.largeMax - r.largeMin
          : null,
    }));
}

function latestVal(rows: DayRow[], key: keyof DayRow) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (v !== null) return v as number;
  }
  return null;
}

function GradeBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[--radius-sm] bg-[--bg-elevated] px-3 py-2">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="label-caps !text-[9px]">{label}</p>
        <p className="data-num text-sm font-semibold text-[--text-primary]">
          {value !== null ? `฿${value.toFixed(2)}` : "—"}
        </p>
      </div>
    </div>
  );
}

export default function PriceChart({
  prices,
  range,
  onRangeChange,
}: {
  prices: MarketPrice[];
  range: PriceRange;
  onRangeChange: (r: PriceRange) => void;
}) {
  const rows = buildRows(prices);

  const maxPrice = Math.max(
    ...rows.flatMap((r) =>
      [
        r.smallMax,
        r.smallMin,
        r.medMax,
        r.medMin,
        r.largeMax,
        r.largeMin,
      ].filter((v): v is number => v !== null),
    ),
  );
  const yDomain: [number, number] = [0, Math.max(30, (maxPrice || 0) + 5)];

  return (
    <Card noPad className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="label-caps mb-1">Market Price Trend</p>
          <p className="text-xs text-[--text-muted]">
            Talad Thai · THB/kg · shaded band = min–max range
          </p>
        </div>
        <div className="flex rounded-[--radius-sm] border border-[--border] overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                range === r
                  ? "bg-[--text-primary] text-[--text-on-dark]"
                  : "text-[--text-secondary] hover:bg-[--bg-elevated]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <GradeBadge
          label="Large"
          value={latestVal(rows, "largeMax")}
          color="#1D4ED8"
        />
        <GradeBadge
          label="Medium"
          value={latestVal(rows, "medMax")}
          color="var(--brand-mid)"
        />
        <GradeBadge
          label="Small"
          value={latestVal(rows, "smallMax")}
          color="#7C3AED"
        />
      </div>

      {rows.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[--text-muted]">
          No price data.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={rows}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                try {
                  return format(parseISO(v), "d MMM");
                } catch {
                  return v;
                }
              }}
              tick={AXIS_STYLE}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={AXIS_STYLE}
              unit=" ฿"
              width={50}
              domain={yDomain}
              ticks={Array.from(
                { length: Math.ceil(yDomain[1] / 4) + 0.5},
                (_, i) => i * 4,
              )}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "4 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as DayRow & { date: string };
                if (!d) return null;
                let dateLabel = d.date;
                try { dateLabel = format(parseISO(d.date), "d MMM yyyy"); } catch { /* noop */ }
                const rows: { label: string; color: string; min: number | null; max: number | null }[] = [
                  { label: "Large",  color: "#1D4ED8",          min: d.largeMin, max: d.largeMax },
                  { label: "Medium", color: "var(--brand-mid)", min: d.medMin,   max: d.medMax   },
                  { label: "Small",  color: "#7C3AED",          min: d.smallMin, max: d.smallMax },
                ];
                return (
                  <div className="bg-[--text-primary] border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] bg-black text-xs min-w-[160px]">
                    <p className="data-num text-on-dark  text-[10px] pb-2 mb-2.5 border-b border-white/10">
                      {dateLabel}
                    </p>
                    {rows.filter(r => r.max !== null).map(r => (
                      <div key={r.label} className="flex items-center justify-between gap-6 mb-1.5 last:mb-0 text-on-dark ">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                          <span className="text-on-dark font-medium">{r.label}</span>
                        </div>
                        <span className="data-num text-on-dark font-semibold">
                          {r.min ?? "?"}–{r.max} ฿
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={AXIS_STYLE} />
            <Area
              dataKey="largeMin"
              stackId="large"
              fill="transparent"
              stroke="none"
              legendType="none"
            />
            <Area
              dataKey="largeRange"
              stackId="large"
              fill="#93C5FD"
              fillOpacity={0.25}
              stroke="#1D4ED8"
              strokeWidth={1}
              strokeOpacity={0.4}
              legendType="none"
            />
            <Line
              dataKey="largeMin"
              stroke="#1D4ED8"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={false}
              connectNulls
              legendType="none"
            />
            <Line
              dataKey="largeMax"
              name="Large"
              stroke="#1D4ED8"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Area
              dataKey="medMin"
              stackId="med"
              fill="transparent"
              stroke="none"
              legendType="none"
            />
            <Area
              dataKey="medRange"
              stackId="med"
              fill="#6EE7B7"
              fillOpacity={0.25}
              stroke="var(--brand-mid)"
              strokeWidth={1}
              strokeOpacity={0.4}
              legendType="none"
            />
            <Line
              dataKey="medMin"
              stroke="var(--brand-mid)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={false}
              connectNulls
              legendType="none"
            />
            <Line
              dataKey="medMax"
              name="Medium"
              stroke="var(--brand-mid)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Area
              dataKey="smallMin"
              stackId="small"
              fill="transparent"
              stroke="none"
              legendType="none"
            />
            <Area
              dataKey="smallRange"
              stackId="small"
              fill="#C4B5FD"
              fillOpacity={0.25}
              stroke="#7C3AED"
              strokeWidth={1}
              strokeOpacity={0.4}
              legendType="none"
            />
            <Line
              dataKey="smallMin"
              stroke="#7C3AED"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={false}
              connectNulls
              legendType="none"
            />
            <Line
              dataKey="smallMax"
              name="Small"
              stroke="#7C3AED"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
            <Brush
              dataKey="date"
              height={20}
              stroke="var(--border)"
              fill="var(--bg-elevated)"
              travellerWidth={6}
              tickFormatter={() => ""}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
