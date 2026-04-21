"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Download } from "lucide-react";
import { fetchMarketPrices, type MarketPrice } from "@/lib/api";
import PriceChart, { type PriceRange } from "@/components/PriceChart";
import ExportCsvModal, { type ExportConfig } from "@/components/ExportCsvModal";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const RANGE_DAYS: Record<PriceRange, number> = { "30D": 30, "60D": 60, "90D": 90 };

function isoDate(d: Date) { return format(d, "yyyy-MM-dd"); }

const GRADES = [
  { id: 182, label: "Large",  size: "large",  dot: "#1D4ED8" },
  { id: 206, label: "Medium", size: "medium", dot: "var(--brand-mid)" },
  { id: 216, label: "Small",  size: "small",  dot: "#7C3AED" },
];

interface PriceStat {
  label: string; dot: string;
  latest: number | null; high: number | null; low: number | null;
}

function buildStats(prices: MarketPrice[]): PriceStat[] {
  return GRADES.map(g => {
    const byGrade = prices.filter(p => p.size === g.size);
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
  const [showExport, setShowExport] = useState(false);

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
    gsap.set(".price-stat", { opacity: 0, y: 30 });
    gsap.set(".animate-section", { opacity: 0, y: 40 });

    ScrollTrigger.batch(".price-stat", {
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power2.out" }),
      once: true, start: "top 90%",
    });
    ScrollTrigger.batch(".animate-section", {
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }),
      once: true, start: "top 88%",
    });

    gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
  }, { scope: page });

  const stats = buildStats(prices);

  // Build per-date rows: { date, large, medium, small }
  interface PriceRow { date: string; large: string | null; medium: string | null; small: string | null; }
  const priceHistory: PriceRow[] = (() => {
    const byDate = new Map<string, PriceRow>();
    for (const p of prices) {
      if (!byDate.has(p.record_date)) byDate.set(p.record_date, { date: p.record_date, large: null, medium: null, small: null });
      const row = byDate.get(p.record_date)!;
      const val = p.price_max !== null ? `฿${Number(p.price_max).toFixed(2)}` : null;
      if (p.size === "large") row.large  = val;
      if (p.size === "medium") row.medium = val;
      if (p.size === "small") row.small  = val;
    }
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  })();

  const marketExportConfig: ExportConfig = {
    title: "Export Market Prices",
    description: "Download Talad Thai corn price data as a spreadsheet.",
    filenamePrefix: "market_prices",
    preloaded: prices as unknown as Record<string, unknown>[],
    fetchAll: (pre) => Promise.resolve(pre),
    fetchRange: async (startIso, endIso) => {
      const rows = await fetchMarketPrices(startIso.slice(0, 10), endIso.slice(0, 10));
      return rows as unknown as Record<string, unknown>[];
    },
  };

  return (
    <div ref={page} className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 py-10 flex flex-col gap-8">

      <PageHeader
        eyebrow="Talad Thai Market"
        title="Market Prices"
        description="Sweet corn price trends — small, medium and large grade."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowExport(true)}
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

      {/* Info note */}
      <div className="animate-section rounded-[--radius-lg] bg-[--amber-light] border border-[--border] p-5 text-sm">
        <p className="font-semibold mb-1.5 text-[--amber]">About price data</p>
        <p className="text-xs leading-relaxed text-[--text-secondary]">
          Prices are sourced from Talad Thai (ตลาดไท) and updated daily. They reflect the wholesale market
          price range for fresh sweet corn. <strong className="text-[--text-primary]">Large grade</strong> (product 182) typically commands
          the highest price; <strong className="text-[--text-primary]">small grade</strong> (product 216) the lowest.
        </p>
      </div>

      {/* Price history table */}
      {!loading && priceHistory.length > 0 && (
        <Card className="animate-section p-6">
          <p className="label-caps mb-5">
            Daily Price History
            <span className="ml-2 text-[--text-muted] font-normal normal-case">({range} · max price per grade)</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[--border] text-left">
                  {["Date", "Large (฿/kg)", "Medium (฿/kg)", "Small (฿/kg)"].map(h => (
                    <th key={h} className="pb-2.5 pr-6 label-caps !text-[9px] font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceHistory.map(row => (
                  <tr
                    key={row.date}
                    className="border-b border-[--border] last:border-0 cursor-default"
                    onMouseEnter={(e) => {
                      const cells = Array.from(e.currentTarget.querySelectorAll("td"));
                      gsap.to(cells, { backgroundColor: "#1A1714", duration: 0.18, ease: "power2.out", overwrite: true });
                      const hoverColors = ["rgba(240,237,230,0.45)", "#5B86E5", "#4A9B6F", "#A78BFA"];
                      cells.forEach((cell, i) => {
                        if (hoverColors[i]) gsap.to(cell, { color: hoverColors[i], duration: 0.18, ease: "power2.out", overwrite: "auto" });
                      });
                    }}
                    onMouseLeave={(e) => {
                      const cells = Array.from(e.currentTarget.querySelectorAll("td"));
                      gsap.to(cells, { backgroundColor: "transparent", duration: 0.32, ease: "power2.inOut", overwrite: true });
                      const restColors = ["#A49E98", "#6A6560", "#6A6560", "#6A6560"];
                      cells.forEach((cell, i) => {
                        if (restColors[i]) gsap.to(cell, { color: restColors[i], duration: 0.28, ease: "power2.inOut", overwrite: "auto" });
                      });
                    }}
                  >
                    <td className="py-2.5 pr-6 text-[--text-muted] whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 pr-6 data-num text-[--text-secondary]">{row.large  ?? "—"}</td>
                    <td className="py-2.5 pr-6 data-num text-[--text-secondary]">{row.medium ?? "—"}</td>
                    <td className="py-2.5 pr-6 data-num text-[--text-secondary]">{row.small  ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showExport && (
        <ExportCsvModal
          config={marketExportConfig}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
