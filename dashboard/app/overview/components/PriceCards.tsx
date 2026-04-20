"use client";

import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MarketPrice } from "@/lib/api";

const GRADES = [
  { id: 182, label: "Large",  color: "#1D4ED8" },
  { id: 206, label: "Medium", color: "var(--brand-mid)" },
  { id: 216, label: "Small",  color: "#7C3AED" },
];

interface GradeStat {
  label: string;
  color: string;
  today: number | null;
  yesterday: number | null;
}

function buildStats(prices: MarketPrice[]): GradeStat[] {
  return GRADES.map(g => {
    const rows = prices
      .filter(p => p.product_id === g.id)
      .sort((a, b) => b.record_date.localeCompare(a.record_date));
    return {
      label:     g.label,
      color:     g.color,
      today:     rows[0]?.price_max != null ? +rows[0].price_max : null,
      yesterday: rows[1]?.price_max != null ? +rows[1].price_max : null,
    };
  });
}

function DeltaBadge({ today, yesterday }: { today: number | null; yesterday: number | null }) {
  if (today === null || yesterday === null) return null;
  const diff = today - yesterday;
  if (Math.abs(diff) < 0.005) return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[--text-muted]">
      <Minus size={10} /> 0.00
    </span>
  );
  const up = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(diff).toFixed(2)}
    </span>
  );
}

export default function PriceCards({ prices }: { prices: MarketPrice[] }) {
  const stats = buildStats(prices);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="label-caps">Market Prices</p>
        <Link
          href="/market"
          className="flex items-center gap-1 text-[12px] font-medium text-[--brand-mid] hover:text-[--brand] transition-colors"
        >
          Full market <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <p className="label-caps !text-[9px]">{s.label} grade</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="data-num text-2xl font-semibold text-[--text-primary]">
                {s.today !== null ? `฿${s.today.toFixed(2)}` : "—"}
              </span>
              <span className="text-[10px] text-[--text-muted]">/kg</span>
            </div>
            <DeltaBadge today={s.today} yesterday={s.yesterday} />
          </div>
        ))}
      </div>
    </div>
  );
}
