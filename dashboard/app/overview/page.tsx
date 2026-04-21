"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays, addDays, differenceInDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Thermometer, Droplets, Sun, ArrowUpRight } from "lucide-react";
import { Sprout } from "lucide-react";
import {
  fetchFarms, fetchLatestSensor, fetchSensors, fetchGrowthLogs,
  fetchWeatherDaily, fetchMarketPrices, fetchGdd,
  type SensorReading, type GrowthLog, type WeatherDaily, type MarketPrice, type GddSummary,
} from "@/lib/api";
import { CORN_STAGES } from "@/lib/stages";
import StatCard from "@/components/StatCard";
import WeatherForecast from "@/components/WeatherForecast";
import PriceChart from "@/components/PriceChart";
import Button from "@/components/ui/Button";
import GddChart from "./components/GddChart";
import SensorGrid from "./components/SensorGrid";
import PriceCards from "./components/PriceCards";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function isoDate(d: Date) { return format(d, "yyyy-MM-dd"); }

/** Format in LOCAL time without timezone suffix so Bangkok-stored DB timestamps compare correctly. */
function localIso(d: Date) { return format(d, "yyyy-MM-dd'T'HH:mm:ss"); }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [farmId, setFarmId]     = useState<string | null>(null);
  const [latest, setLatest]     = useState<SensorReading | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [logs, setLogs]         = useState<GrowthLog[]>([]);
  const [weather, setWeather]   = useState<WeatherDaily[]>([]);
  const [prices, setPrices]     = useState<MarketPrice[]>([]);
  const [gddData, setGddData]   = useState<GddSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError]       = useState("");

  const page = useRef<HTMLDivElement>(null);

  // Fetch farm list on mount and pick the first farm
  useEffect(() => {
    fetchFarms()
      .then(farms => {
        if (farms.length > 0) setFarmId(farms[0].id);
        else setError("No farms found.");
      })
      .catch(() => setError("Failed to load farm list."));
  }, []);

  const load = useCallback(async (fid: string) => {
    setError("");
    try {
      const now = new Date();

      // Get growth logs + GDD summary first — planting date needed for sensor range
      const [logsResult, gddResult] = await Promise.allSettled([
        fetchGrowthLogs(fid),
        fetchGdd(fid),
      ]);

      const growthLogs = logsResult.status === "fulfilled" ? logsResult.value : [];
      setLogs(growthLogs);
      if (gddResult.status === "fulfilled") setGddData(gddResult.value);

      // Determine planting date: prefer backend result, fall back to log scan
      const plantingDateStr = gddResult.status === "fulfilled"
        ? gddResult.value.planting_date
        : null;
      const plantingLog = [...growthLogs]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .find(l => l.growth_progress_in_gdd === 0);
      const plantingDate = plantingDateStr
        ? new Date(plantingDateStr)
        : plantingLog
          ? new Date(plantingLog.created_at)
          : subDays(now, 90);

      const results = await Promise.allSettled([
        fetchLatestSensor(fid),
        fetchSensors(localIso(plantingDate), localIso(addDays(now, 1)), fid),
        fetchWeatherDaily(isoDate(now), isoDate(addDays(now, 7))),
        fetchMarketPrices(isoDate(subDays(now, 32)), isoDate(now)),
      ]);

      const [latestResult, sensorResult, wxResult, mktResult] = results;

      if (latestResult.status === "fulfilled") setLatest(latestResult.value[0] ?? null);
      if (sensorResult.status === "fulfilled") setReadings(sensorResult.value);
      if (wxResult.status === "fulfilled") setWeather(wxResult.value);
      if (mktResult.status === "fulfilled") setPrices(mktResult.value);

      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmId) load(farmId);
  }, [farmId, load]);

  useGSAP(() => {
    gsap.from(".page-title-label", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out" });
    gsap.from(".page-title-heading", { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.08 });
    gsap.from(".page-title-actions", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.25 });

    gsap.from(".hero-strip", {
      y: 40, opacity: 0, duration: 1.0,
      ease: "power3.out", delay: 0.3,
    });
    gsap.from(".stat-card", {
      y: 28, opacity: 0, stagger: 0.07, duration: 0.65,
      ease: "power2.out", delay: 0.55,
    });

    gsap.set(".scroll-reveal", { opacity: 0, y: 44 });
    gsap.set(".section-heading", { opacity: 0, x: -20 });

    ScrollTrigger.batch(".scroll-reveal", {
      onEnter: (els) =>
        gsap.to(els, { opacity: 1, y: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" }),
      once: true,
      start: "top 88%",
    });

    ScrollTrigger.batch(".section-heading", {
      onEnter: (els) =>
        gsap.to(els, { opacity: 1, x: 0, stagger: 0.08, duration: 0.75, ease: "power2.out" }),
      once: true,
      start: "top 88%",
    });

    gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
  }, { scope: page });

  // Derived values
  const temp     = latest?.temp_i2c ?? latest?.temperature ?? null;
  const moisture = latest?.moisture ?? null;

  const plantingLog = [...logs]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .find(l => l.growth_progress_in_gdd === 0);
  const plantingIso = gddData?.planting_date
    ?? plantingLog?.created_at.slice(0, 10)
    ?? isoDate(subDays(new Date(), 90));

  const medPrice = prices
    .filter(p => p.product_id === 206)
    .sort((a, b) => b.record_date.localeCompare(a.record_date))[0];
  const latestMedPrice = medPrice?.price_max != null ? +medPrice.price_max : null;

  function soilAlert() {
    if (moisture === null) return false;
    return moisture < 30;
  }
  function soilSubtitle() {
    if (moisture === null) return undefined;
    if (moisture < 30) return "Low — check irrigation";
    if (moisture > 70) return "Well saturated";
    return "Good level";
  }

  function minAgo(iso: string | undefined) {
    if (!iso) return undefined;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ago`;
  }

  const sensorAge = minAgo(latest?.created_at);

  return (
    <div ref={page} className="max-w-[1920px] mx-auto w-full px-4 sm:px-8 lg:px-12 py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">

      {/* ── Page title row ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <p className="page-title-label label-caps text-[--text-muted] mb-3 tracking-[0.18em]">
            {farmId ?? "—"} &ensp;&middot;&ensp; Farm Overview
          </p>
          <h1
            className="page-title-heading display-italic text-[--text-primary] leading-[0.90] tracking-tighter"
            style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
          >
            Field Center
          </h1>
        </div>
        <div className="page-title-actions flex items-center gap-3 flex-shrink-0 pb-2">
          {lastUpdate && (
            <span className="label-caps text-[--text-muted] hidden sm:block">
              Updated {format(lastUpdate, "HH:mm")}
            </span>
          )}
          <button
            onClick={() => { if (farmId) { setLoading(true); load(farmId); } }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[--radius-sm] border border-[--border] text-[13px] font-medium text-[--text-secondary] hover:bg-[--bg-elevated] disabled:opacity-50 transition-all duration-150"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-[--radius-md] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Live field conditions ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-6 gap-4">
          <h2
            className="section-heading display text-[--text-primary] leading-[0.93] tracking-tighter"
            style={{ fontSize: "clamp(1.67rem, 4vw, 3rem)" }}
          >
            Live Conditions
          </h2>
          {sensorAge && <span className="label-caps text-[--text-muted] mb-1">{sensorAge}</span>}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-[120px] sm:h-[136px] animate-pulse bg-[--bg-elevated]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Temperature"
              rawValue={temp}
              unit="°C"
              icon={<Thermometer size={18} />}
              decimals={1}
              valueColor="var(--red, #E05252)"
            />
            <StatCard
              label="Humidity"
              rawValue={latest?.humidity ?? null}
              unit="%"
              icon={<Droplets size={18} />}
              decimals={1}
              valueColor="#3B82F6"
            />
            <StatCard
              label="Soil Moisture"
              rawValue={moisture}
              unit="%"
              icon={<Sprout size={18} />}
              decimals={1}
              valueColor="var(--brand-mid)"
              alert={soilAlert()}
              subtitle={soilSubtitle()}
            />
            <StatCard
              label="Light"
              rawValue={latest?.light ?? null}
              unit="lux"
              icon={<Sun size={18} />}
              decimals={0}
              valueColor="var(--amber)"
            />
          </div>
        )}
      </section>

      {/* ── GDD growth curve ───────────────────────────────────────────────── */}
      <div className="scroll-reveal flex flex-col gap-6">
        <h2
          className="section-heading display text-[--text-primary] leading-[0.93] tracking-tighter"
            style={{ fontSize: "clamp(1.67rem, 4vw, 3rem)" }}
        >
          Growth Curve
        </h2>
        {loading ? (
          <div className="card h-80 animate-pulse bg-[--bg-elevated]" />
        ) : (
          <GddChart readings={readings} logs={logs} plantingIso={plantingIso} />
        )}
      </div>

      {/* ── 4 sensor history charts ────────────────────────────────────────── */}
      <div className="scroll-reveal flex flex-col gap-6">
        <h2
          className="section-heading display text-[--text-primary] leading-[0.93] tracking-tighter"
            style={{ fontSize: "clamp(1.67rem, 4vw, 3rem)" }}
        >
          Sensor History
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-[--bg-elevated]" />
            ))}
          </div>
        ) : (
          <SensorGrid readings={readings} plantingDate={plantingIso} />
        )}
      </div>

      {/* ── Market prices ──────────────────────────────────────────────────── */}
      <div className="scroll-reveal flex flex-col gap-6">
        <h2
          className="section-heading display text-[--text-primary] leading-[0.93] tracking-tighter"
            style={{ fontSize: "clamp(1.67rem, 4vw, 3rem)" }}
        >
          Market Prices
        </h2>
        {loading ? (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card h-28 animate-pulse bg-[--bg-elevated]" />
              ))}
            </div>
            <div className="card h-80 animate-pulse bg-[--bg-elevated]" />
          </>
        ) : (
          <>
            <PriceCards prices={prices} />
            <PriceChart prices={prices} range="30D" onRangeChange={() => {}} />
          </>
        )}
      </div>

      {/* ── 7-day weather ──────────────────────────────────────────────────── */}
      <div className="scroll-reveal flex flex-col gap-6">
        <h2
          className="section-heading display text-[--text-primary] leading-[0.93] tracking-tighter"
            style={{ fontSize: "clamp(1.67rem, 4vw, 3rem)" }}
        >
          Weather Forecast
        </h2>
        {loading ? (
          <div className="card h-44 animate-pulse bg-[--bg-elevated]" />
        ) : (
          <WeatherForecast forecast={weather} maxDays={7} />
        )}
      </div>

      {/* ── Bottom nav hints ───────────────────────────────────────────────── */}
      <div className="scroll-reveal pb-6">
        <hr className="section-rule mb-8" />
        <p className="label-caps text-[--text-muted] mb-6 tracking-[0.16em]">Explore more</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/monitor", label: "Field Monitor",  desc: "Full sensor charts & weather deep-dive" },
            { href: "/growth",  label: "Corn Growth",    desc: "Log observations & view full GDD timeline" },
            { href: "/market",  label: "Market Prices",  desc: "Price history across all 3 corn grades" },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between p-5 rounded-[--radius-lg] border border-[--border] hover:border-[--brand-mid] hover:bg-[--brand-light] transition-all duration-250"
            >
              <div>
                <p className="display text-lg text-[--text-primary] group-hover:text-[--brand] transition-colors leading-tight mb-0.5">
                  {link.label}
                </p>
                <p className="text-[11px] text-[--text-muted] leading-relaxed">{link.desc}</p>
              </div>
              <ArrowUpRight
                size={16}
                className="text-[--text-muted] group-hover:text-[--brand-mid] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0 ml-4"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
