"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Activity, Sprout, TrendingUp, ArrowRight } from "lucide-react";
import {
  fetchLatestSensor, fetchGrowthLogs, fetchMarketPrices,
  type SensorReading, type GrowthLog, type MarketPrice,
} from "@/lib/api";
import StatCard from "@/components/StatCard";
import { Thermometer, Droplets, Sun } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HARVEST_GDD = 750;

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function MinutesAgo({ iso }: { iso: string | undefined }) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const label = diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ago`;
  return <span className="label-caps text-[--text-muted]">Updated {label}</span>;
}

function GddRing({ pct }: { pct: number }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={120} height={120} className="-rotate-90">
      <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={10} />
      <circle
        cx={60} cy={60} r={r} fill="none"
        stroke="white" strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

const NAV_CARDS = [
  {
    href: "/monitor",
    Icon: Activity,
    title: "Field Monitor",
    desc: "Deep-dive into IoT sensor readings, weather forecasts and field conditions over time.",
    accent: "var(--brand-mid)",
  },
  {
    href: "/growth",
    Icon: Sprout,
    title: "Corn Growth",
    desc: "Track GDD accumulation, crop milestones and log field observations at any date.",
    accent: "var(--brand)",
  },
  {
    href: "/market",
    Icon: TrendingUp,
    title: "Market Prices",
    desc: "Analyse Talad Thai corn price trends across small, medium and large grades.",
    accent: "var(--amber)",
  },
];

export default function LandingPage() {
  const [sensor, setSensor]   = useState<SensorReading | null>(null);
  const [growth, setGrowth]   = useState<GrowthLog[]>([]);
  const [prices, setPrices]   = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const now = new Date();
      const [sensors, logs, mkt] = await Promise.all([
        fetchLatestSensor(),
        fetchGrowthLogs(),
        fetchMarketPrices(isoDate(subDays(now, 7)), isoDate(now)),
      ]);
      setSensor(sensors[0] ?? null);
      setGrowth(logs);
      setPrices(mkt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useGSAP(() => {
    gsap.from(".hero-line", { y: 60, opacity: 0, stagger: 0.14, duration: 1, ease: "power3.out" });
    gsap.from(".stat-card",  { y: 40, opacity: 0, stagger: 0.09, duration: 0.7, ease: "power2.out", delay: 0.6 });
    gsap.from(".status-strip", { y: 30, opacity: 0, duration: 0.6, ease: "power2.out", delay: 1 });
    ScrollTrigger.batch(".nav-card", {
      onEnter: els => gsap.from(els, { y: 50, opacity: 0, stagger: 0.13, duration: 0.75, ease: "power2.out" }),
      once: true, start: "top 90%",
    });
  }, { scope: page });

  const latestLog  = [...growth].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const currentGdd = latestLog ? parseFloat(latestLog.growth_progress_in_gdd) : NaN;
  const validGdd   = Number.isFinite(currentGdd) ? currentGdd : 0;
  const gddPct     = Math.min((validGdd / HARVEST_GDD) * 100, 100);

  const medPrice = prices
    .filter(p => p.product_id === 206)
    .sort((a, b) => b.record_date.localeCompare(a.record_date))[0];

  const temp     = sensor?.temp_i2c ?? sensor?.temperature ?? null;
  const moisture = sensor?.moisture ?? null;

  function soilSubtitle() {
    if (moisture === null) return undefined;
    if (moisture < 30) return "⚠️ Low — check irrigation";
    if (moisture > 70) return "Well saturated";
    return "Good level";
  }

  return (
    <div ref={page} className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-12">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[--radius-xl] bg-[--brand] px-8 py-12 shadow-[--shadow-lg]">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-black/10 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-10">
          <div className="flex-1">
            <p className="hero-line label-caps text-white/50 mb-5">
              {format(new Date(), "EEEE, d MMMM yyyy")} · Corn Field Dashboard
            </p>
            <h1 className="hero-line display-italic text-5xl sm:text-6xl text-[--text-on-dark] leading-[1.05] mb-4">
              Your field,<br />
              <span className="text-white/60">always in sight.</span>
            </h1>
            <p className="hero-line text-white/50 text-sm sm:text-base max-w-md leading-relaxed">
              IoT sensors · TMD weather forecasts · Talad Thai market prices — unified in one dashboard.
            </p>
          </div>

          {/* GDD ring */}
          <div className="hero-line flex flex-col items-center gap-3 flex-shrink-0">
            <div className="relative">
              <GddRing pct={loading ? 0 : gddPct} />
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
                <span className="data-num text-2xl font-semibold text-white leading-none">{validGdd.toFixed(0)}</span>
                <span className="label-caps text-white/50 mt-0.5">GDD</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50">of {HARVEST_GDD} to harvest</p>
              {validGdd > 0 && (
                <p className="data-num text-xs font-semibold text-white/80 mt-0.5">{gddPct.toFixed(0)}% complete</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-[--radius-md] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <p className="label-caps">Today&apos;s Field Conditions</p>
          <MinutesAgo iso={sensor?.created_at} />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-[--bg-elevated]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Temperature"     rawValue={temp}                      unit="°C"  icon={<Thermometer size={20} />} decimals={1} valueColor="var(--red,#E05252)" />
            <StatCard label="Humidity"        rawValue={sensor?.humidity ?? null}  unit="%"   icon={<Droplets   size={20} />} decimals={1} valueColor="#3B82F6" />
            <StatCard label="Soil Moisture"   rawValue={moisture}                  unit="%"   icon={<Sprout     size={20} />} decimals={1} valueColor="var(--brand-mid)"
              alert={moisture !== null && moisture < 30} subtitle={soilSubtitle()} />
            <StatCard label="Light Intensity" rawValue={sensor?.light ?? null}     unit="lux" icon={<Sun        size={20} />} decimals={0} valueColor="var(--amber)" />
          </div>
        )}
      </section>

      {/* ── Status Strip ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="status-strip grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* GDD progress */}
          <div className="card p-6">
            <p className="label-caps mb-4">GDD Progress to Harvest</p>
            <div className="flex items-end justify-between mb-3">
              <span className="data-num text-4xl font-semibold text-[--brand]">{validGdd.toFixed(0)}</span>
              <span className="text-sm text-[--text-muted] pb-1">/ {HARVEST_GDD} GDD</span>
            </div>
            <div className="h-2 rounded-full bg-[--bg-elevated] mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[--brand-mid] to-[--brand] transition-all duration-1000"
                style={{ width: `${gddPct}%` }}
              />
            </div>
            <p className="text-xs text-[--text-muted]">
              {validGdd >= 700
                ? "Ready to harvest!"
                : `${(HARVEST_GDD - validGdd).toFixed(0)} GDD remaining to harvest window`}
            </p>
          </div>

          {/* Latest market price */}
          <div className="card p-6">
            <p className="label-caps mb-4">Today&apos;s Market Price</p>
            {medPrice ? (
              <>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="data-num text-4xl font-semibold text-[--amber]">
                    ฿{medPrice.price_max !== null ? Number(medPrice.price_max).toFixed(2) : "—"}
                  </span>
                  <span className="text-sm text-[--text-muted]">/ kg</span>
                </div>
                <p className="text-xs text-[--text-muted]">
                  Medium grade · {format(new Date(medPrice.record_date), "d MMM yyyy")}
                  {medPrice.price_min !== null && ` · Low ฿${Number(medPrice.price_min).toFixed(2)}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-[--text-muted]">No price data available.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation Cards ─────────────────────────────────────────────────── */}
      <section className="pb-6">
        <p className="label-caps mb-6">Explore</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {NAV_CARDS.map(card => {
            const CardIcon = card.Icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="nav-card card card-interactive group relative overflow-hidden p-6 flex flex-col gap-4"
              >
                <div className="w-11 h-11 rounded-[--radius-md] bg-[--bg-elevated] flex items-center justify-center
                  group-hover:scale-110 transition-transform duration-300">
                  <CardIcon size={22} style={{ color: card.accent }} />
                </div>

                <div>
                  <h3 className="display text-xl mb-1.5" style={{ color: card.accent }}>{card.title}</h3>
                  <p className="text-sm text-[--text-secondary] leading-relaxed">{card.desc}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold mt-auto" style={{ color: card.accent }}>
                  Open
                  <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-200" />
                </div>

                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-[--bg-elevated] opacity-60 pointer-events-none" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
