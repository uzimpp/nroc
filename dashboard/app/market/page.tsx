"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Download } from "lucide-react";
import { fetchMarketPrices, type MarketPrice } from "@/lib/api";
import { downloadCSV, todayStr } from "@/lib/csv";
import PriceChart, { type PriceRange } from "@/components/PriceChart";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const RANGE_DAYS: Record<PriceRange, number> = { "30D": 30, "60D": 60, "90D": 90 };

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

const GRADES = [
  { id: 182, label: "Large",  dot: "#1D4ED8" },
  { id: 206, label: "Medium", dot: "var(--brand-mid)" },
  { id: 216, label: "Small",  dot: "#7C3AED" },
];

interface PriceStat {
  label: string; dot: string;
  latest: number | null; high: number | null; low: number | null;
}

function buildStats(prices: MarketPrice[]): PriceStat[] {
  return GRADES.map(g => {
    const byGrade = prices.filter(p => p.product_id === g.id);
    const sorted  = [...byGrade].sort((a, b) => b.record_date.localeCompare(a.record_date));
    const maxes   = byGrade.map(p => p.price_max).filter((v): v is number => v !== null);
    const mins    = byGrade.map(p => p.price_min).filter((v): v is number => v !== null);
    return {
      label:  g.label,
      dot:    g.dot,
      latest: sorted[0]?.price_max != null ? +sorted[0].price_max : null,
      high:   maxes.length ? Math.max(...maxes.map(Number)) : null,
      low:    mins.length  ? Math.min(...mins.map(Number))  : null,
    };
  });
}

function PriceStatCard({ stat }: { stat: PriceStat }) {
  return (
    <div className="price-stat card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.dot }} />
        <p className="label-caps">{stat.label} Grade</p>
      </div>
      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="data-num text-3xl font-semibold text-[--text-primary]">
          {stat.latest !== null ? `฿${stat.latest.toFixed(2)}` : "—"}
        </span>
        <span className="text-sm text-[--text-muted]">/ kg</span>
      </div>
      <div className="flex gap-5 text-xs text-[--text-muted]">
        <div>
          <p className="label-caps mb-0.5">Period High</p>
          <p className="data-num font-semibold text-[--text-secondary]">{stat.high !== null ? `฿${stat.high.toFixed(2)}` : "—"}</p>
        </div>
        <div>
          <p className="label-caps mb-0.5">Period Low</p>
          <p className="data-num font-semibold text-[--text-secondary]">{stat.low !== null ? `฿${stat.low.toFixed(2)}` : "—"}</p>
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [prices, setPrices]   = useState<MarketPrice[]>([]);
  const [range, setRange]     = useState<PriceRange>("30D");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async (r: PriceRange) => {
    setError("");
    const now   = new Date();
    const start = subDays(now, RANGE_DAYS[r]);
    try {
      setPrices(await fetchMarketPrices(isoDate(start), isoDate(now)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load price data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  function handleRange(r: PriceRange) { setRange(r); setLoading(true); }

  useGSAP(() => {
    ScrollTrigger.batch(".price-stat", {
      onEnter: els => gsap.from(els, { y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power2.out" }),
      once: true, start: "top 90%",
    });
    ScrollTrigger.batch(".animate-section", {
      onEnter: els => gsap.from(els, { y: 40, opacity: 0, duration: 0.7, ease: "power2.out" }),
      once: true, start: "top 88%",
    });
  }, { scope: page });

  const stats     = buildStats(prices);
  const recentMed = prices
    .filter(p => p.product_id === 206)
    .sort((a, b) => b.record_date.localeCompare(a.record_date))
    .slice(0, 14);

  return (
    <div ref={page} className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <PageHeader
        eyebrow="Talad Thai Market"
        title="Market Prices"
        description="Sweet corn price trends — small, medium and large grade."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => downloadCSV(prices as unknown as Record<string, unknown>[], `market_prices_${todayStr()}.csv`)}
              disabled={loading || prices.length === 0}
            >
              <Download size={14} className="mr-1.5" />Export CSV
            </Button>
            <Button variant="secondary" onClick={() => { setLoading(true); load(range); }}>
              <RefreshCw size={14} className="mr-1.5" />Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-[--radius-md] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Grade stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-[--radius-lg] bg-[--bg-elevated] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => <PriceStatCard key={s.label} stat={s} />)}
        </div>
      )}

      {/* Chart */}
      <div className="animate-section">
        {loading ? (
          <div className="h-96 rounded-[--radius-lg] bg-[--bg-elevated] animate-pulse" />
        ) : (
          <PriceChart prices={prices} range={range} onRangeChange={handleRange} />
        )}
      </div>

      {/* Recent medium grade table */}
      {!loading && recentMed.length > 0 && (
        <Card className="animate-section p-6">
          <p className="label-caps mb-5">
            Medium Grade — Recent History
            <span className="ml-2 text-[--text-muted] font-normal normal-case">(last 14 days)</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border]">
                  {["Date", "Price (High)", "Price (Low)", "Unit"].map(h => (
                    <th key={h} className="pb-2.5 pr-6 text-left label-caps !text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMed.map(p => (
                  <tr key={p.id} className="border-b border-[--border] last:border-0 hover:bg-[--bg-elevated] transition-colors">
                    <td className="py-2.5 pr-6 text-[--text-muted] whitespace-nowrap">
                      {format(new Date(p.record_date), "d MMM yyyy")}
                    </td>
                    <td className="py-2.5 pr-6 data-num font-semibold text-[--brand]">
                      {p.price_max !== null ? `฿${Number(p.price_max).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 pr-6 data-num text-[--text-secondary]">
                      {p.price_min !== null ? `฿${Number(p.price_min).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 text-[--text-muted] text-xs">{p.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info note */}
      <div className="animate-section rounded-[--radius-lg] bg-amber-50 border border-amber-100 p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1.5">About price data</p>
        <p className="text-xs leading-relaxed text-amber-700">
          Prices are sourced from Talad Thai (ตลาดไท) and updated daily. They reflect the wholesale market
          price range for fresh sweet corn. <strong>Large grade</strong> (product 182) typically commands
          the highest price; <strong>small grade</strong> (product 216) the lowest.
        </p>
      </div>
    </div>
  );
}
