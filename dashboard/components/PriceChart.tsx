"use client";

import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import type { MarketPrice } from "@/lib/api";
import Card from "./ui/Card";

export type PriceRange = "30D" | "60D" | "90D";

interface DayRow {
  date: string;
  smallMin: number | null; smallMax: number | null;
  medMin:   number | null; medMax:   number | null;
  largeMin: number | null; largeMax: number | null;
}

const PRODUCTS: Record<number, "small" | "med" | "large"> = { 216: "small", 206: "med", 182: "large" };
const RANGES: PriceRange[] = ["30D", "60D", "90D"];
const AXIS_STYLE = { fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono, monospace)" };

function buildRows(prices: MarketPrice[]): DayRow[] {
  const map = new Map<string, DayRow>();
  for (const p of prices) {
    const key = p.record_date.slice(0, 10);
    if (!map.has(key)) map.set(key, { date: key, smallMin: null, smallMax: null, medMin: null, medMax: null, largeMin: null, largeMax: null });
    const row = map.get(key)!;
    const g = PRODUCTS[p.product_id];
    if (!g) continue;
    if (p.price_min !== null) (row as unknown as Record<string, number | null>)[`${g}Min`] = +p.price_min;
    if (p.price_max !== null) (row as unknown as Record<string, number | null>)[`${g}Max`] = +p.price_max;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function latestVal(rows: DayRow[], key: keyof DayRow) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key]; if (v !== null) return v as number;
  }
  return null;
}

function GradeBadge({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[--radius-sm] bg-[--bg-elevated] px-3 py-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="label-caps !text-[9px]">{label}</p>
        <p className="data-num text-sm font-semibold text-[--text-primary]">
          {value !== null ? `฿${value.toFixed(2)}` : "—"}
        </p>
      </div>
    </div>
  );
}

export default function PriceChart({ prices, range, onRangeChange }: {
  prices: MarketPrice[];
  range: PriceRange;
  onRangeChange: (r: PriceRange) => void;
}) {
  const rows = buildRows(prices);

  return (
    <Card noPad className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="label-caps mb-1">Market Price Trend</p>
          <p className="text-xs text-[--text-muted]">Talad Thai · THB/kg · shaded band = min–max range</p>
        </div>
        <div className="flex rounded-[--radius-sm] border border-[--border] overflow-hidden">
          {RANGES.map(r => (
            <button key={r} onClick={() => onRangeChange(r)}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                range === r ? "bg-[--text-primary] text-[--text-on-dark]" : "text-[--text-secondary] hover:bg-[--bg-elevated]"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <GradeBadge label="Large"  value={latestVal(rows, "largeMax")} color="#1D4ED8" />
        <GradeBadge label="Medium" value={latestVal(rows, "medMax")}   color="var(--brand-mid)" />
        <GradeBadge label="Small"  value={latestVal(rows, "smallMax")} color="#7C3AED" />
      </div>

      {rows.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[--text-muted]">No price data.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), "d MMM"); } catch { return v; } }}
              tick={AXIS_STYLE} interval="preserveStartEnd" minTickGap={40} />
            <YAxis tick={AXIS_STYLE} unit=" ฿" width={50} domain={["auto", "auto"]} />
            <Tooltip labelFormatter={v => { try { return format(parseISO(String(v)), "d MMM yyyy"); } catch { return String(v); } }}
              formatter={(v, n) => [v !== null ? `฿${Number(v).toFixed(2)}` : "—", String(n)]} />
            <Legend wrapperStyle={AXIS_STYLE} />
            <Area dataKey="largeMax" fill="#DBEAFE" stroke="none" legendType="none" />
            <Area dataKey="largeMin" fill="#F8FAFF"  stroke="none" legendType="none" />
            <Line dataKey="largeMax" name="Large"  stroke="#1D4ED8" strokeWidth={2.5} dot={false} connectNulls />
            <Area dataKey="medMax" fill="#D1FAE5" stroke="none" legendType="none" />
            <Area dataKey="medMin" fill="#F0FFF7"  stroke="none" legendType="none" />
            <Line dataKey="medMax" name="Medium" stroke="var(--brand-mid)" strokeWidth={2} dot={false} connectNulls />
            <Line dataKey="smallMax" name="Small" stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
