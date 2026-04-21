"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays, addDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Download, Thermometer, Droplets, Sprout, Sun, CloudRain } from "lucide-react";
import {
  fetchSensors, fetchWeatherDaily, fetchWeatherHourly, fetchRainAccumulation,
  type SensorReading, type WeatherDaily, type RainAccumulation,
} from "@/lib/api";
import { downloadCSV } from "@/lib/csv";
import SensorChartsGrid from "@/components/SensorChartsGrid";
import ExportCsvModal, { type ExportConfig } from "@/components/ExportCsvModal";
import WeatherForecast from "@/components/WeatherForecast";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Range = "7D" | "14D" | "30D";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const RANGE_DAYS: Record<Range, number> = { "7D": 7, "14D": 14, "30D": 30 };

function isoDate(d: Date) { return format(d, "yyyy-MM-dd"); }
function localIso(d: Date) { return format(d, "yyyy-MM-dd'T'HH:mm:ss"); }

interface PillProps { label: string; value: string; unit: string; color: string; icon?: React.ReactNode; }
function SummaryPill({ label, value, unit, color, icon }: PillProps) {
  return (
    <div className={`summary-pill rounded-[--radius-md] px-4 py-2.5 flex flex-col gap-0.5 ${color}`}>
      <p className="label-caps !text-[9px] opacity-60">{label}</p>
      <div className="flex items-baseline gap-1">
        {icon}
        <span className="data-num text-lg font-semibold">{value}</span>
        <span className="text-[11px] opacity-50">{unit}</span>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const [readings, setReadings]     = useState<SensorReading[]>([]);
  const [weather, setWeather]       = useState<WeatherDaily[]>([]);
  const [rain, setRain]             = useState<RainAccumulation | null>(null);
  const [range, setRange]           = useState<Range>("7D");
const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showWeatherExport, setShowWeatherExport] = useState(false);

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async (r: Range) => {
    setError("");
    const now    = new Date();
    const start  = subDays(now, RANGE_DAYS[r]);
    const future = addDays(now, 7);
    try {
      // Sequentially fetch data to prevent concurrent backend queries 
      // from colliding on the un-pooled database connection.
      try {
        const sensResult = await fetchSensors(localIso(start), localIso(addDays(now, 1)));
        setReadings(sensResult);
      } catch (e) { console.error("Sensors error:", e); }

      try {
        const wxResult = await fetchWeatherDaily(isoDate(now), isoDate(future));
        setWeather(wxResult);
      } catch (e) { console.error("Weather error:", e); }

      try {
        const rainResult = await fetchRainAccumulation();
        setRain(rainResult);
      } catch (e) { console.error("Rain error:", e); }

      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  function handleRange(r: Range) { setRange(r); setLoading(true); }

  useGSAP(() => {
    gsap.from(".summary-pill", { scale: 0.85, opacity: 0, stagger: 0.07, duration: 0.5, ease: "back.out(1.4)", delay: 0.2 });

    gsap.set(".animate-section", { opacity: 0, y: 40 });
    ScrollTrigger.batch(".animate-section", {
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, stagger: 0.12, duration: 0.7, ease: "power2.out" }),
      once: true,
      start: "top 88%",
    });

    gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
  }, { scope: page, dependencies: [loading] });

  function periodAvg(field: keyof SensorReading) {
    const vals = readings.map(r => r[field] as number | null).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const avgTemp  = periodAvg("temp_i2c") ?? periodAvg("temperature");
  const avgHum   = periodAvg("humidity");
  const avgMoist = periodAvg("moisture");
  const avgLight = periodAvg("light");
  const latestTime = readings[0] ? format(new Date(readings[0].created_at), "d MMM HH:mm") : "—";

  const sensorExportConfig: ExportConfig = {
    title: "Export Sensor Data",
    description: "Download IoT sensor readings as a spreadsheet.",
    filenamePrefix: "sensor_data",
    preloaded: readings as unknown as Record<string, unknown>[],
    fetchAll: (pre) => Promise.resolve(pre),
    fetchRange: async (startIso, endIso) => {
      const rows = await fetchSensors(startIso, endIso);
      return rows as unknown as Record<string, unknown>[];
    },
  };

  return (
    <div ref={page} className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 py-10 flex flex-col gap-8">

      <PageHeader
        eyebrow="Field Monitor"
        title="Sensor & Weather"
        description="All IoT sensor readings and 5-day weather forecast."
        action={
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="label-caps text-[--text-muted]">Refreshed {format(lastUpdate, "HH:mm")}</span>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowExport(true)}
              disabled={loading || readings.length === 0}
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

      {/* Period summary pills */}
      {!loading && readings.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <p className="w-full label-caps text-[--text-muted] -mb-1">
            {range} Period Averages · Last reading: {latestTime}
          </p>
          <SummaryPill label="Avg Temp"     value={avgTemp  !== null ? avgTemp.toFixed(1)  : "—"} unit="°C"   color="bg-red-50 text-red-700"     icon={<Thermometer size={14} className="mb-0.5" />} />
          <SummaryPill label="Avg Humidity" value={avgHum   !== null ? avgHum.toFixed(1)   : "—"} unit="%"    color="bg-blue-50 text-blue-700"  icon={<Droplets   size={14} className="mb-0.5" />} />
          <SummaryPill label="Avg Soil"     value={avgMoist !== null ? avgMoist.toFixed(1) : "—"} unit="%"    color="bg-[--brand-light] text-[--brand]" icon={<Sprout    size={14} className="mb-0.5" />} />
          <SummaryPill label="Avg Light"    value={avgLight !== null ? Math.round(avgLight).toString() : "—"} unit="lux" color="bg-amber-50 text-amber-700" icon={<Sun      size={14} className="mb-0.5" />} />
          <SummaryPill label="Readings"     value={readings.length.toString()} unit="pts"  color="bg-[--bg-elevated] text-[--text-secondary]" />
          {rain && (
            <SummaryPill label="Weekly Rain" value={rain.total_mm.toFixed(1)} unit="mm" color="bg-blue-50 text-blue-700" icon={<CloudRain size={14} className="mb-0.5" />} />
          )}
        </div>
      )}

      {/* Weekly rain sparkline */}
      {!loading && rain && rain.days.length > 0 && (
        <Card className="animate-section p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CloudRain size={14} className="text-blue-500" />
              <p className="label-caps">Weekly Rain Forecast</p>
            </div>
            <span className="data-num text-sm font-semibold text-blue-600">{rain.total_mm.toFixed(1)} mm total</span>
          </div>
          <div className="flex items-end gap-1.5 h-12">
            {rain.days.map((d, i) => {
              const maxMm = Math.max(...rain.days.map(x => x.total_mm), 1);
              const pct   = (d.total_mm / maxMm) * 100;
              const label = new Date(d.date).toLocaleDateString("en", { weekday: "short" });
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full flex items-end" style={{ height: "36px" }}>
                    <div
                      className="w-full rounded-t-sm bg-blue-400/60 hover:bg-blue-500/80 transition-colors"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`${d.date}: ${d.total_mm.toFixed(1)} mm`}
                    />
                  </div>
                  <span className="label-caps !text-[8px] text-[--text-muted] whitespace-nowrap">{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[--text-muted] mt-2">Forecast data from Thai Met. Dept. · ISO week {rain.week_start} – {rain.week_end}</p>
        </Card>
      )}

      {/* Range selector */}
      <div className="flex items-center gap-1 self-start rounded-[--radius-sm] border border-[--border] p-0.5 bg-[--bg-elevated]">
        {(["7D", "14D", "30D"] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => handleRange(r)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius-sm)-2px)] transition-all duration-150 ${
              range === r
                ? "bg-[--bg-surface] text-[--text-primary] shadow-[--shadow-xs]"
                : "text-[--text-muted] hover:text-[--text-secondary]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Sensor charts grid — 4 individual panels */}
      <div className="animate-section">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-[--bg-elevated]" />
            ))}
          </div>
        ) : (
          <SensorChartsGrid readings={readings} />
        )}
      </div>

      {/* Weather forecast */}
      <div className="animate-section">
        <div className="flex items-center justify-between mb-4">
          <p className="label-caps">5-Day Weather Forecast</p>
          <button
            onClick={() => setShowWeatherExport(true)}
            disabled={weather.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-sm] border border-[--border] text-[11px] font-medium text-[--text-secondary] hover:bg-[--bg-elevated] disabled:opacity-50 transition-all duration-150"
          >
            <Download size={12} /> Export
          </button>
        </div>
        {loading ? (
          <div className="h-48 rounded-[--radius-lg] bg-[--bg-elevated] animate-pulse" />
        ) : (
          <WeatherForecast forecast={weather} />
        )}
      </div>

      {/* Recent readings table */}
      {!loading && readings.length > 0 && (
        <Card className="animate-section p-6">
          <p className="label-caps mb-5">
            Recent Readings
            <span className="ml-2 text-[--text-muted] font-normal normal-case">(latest 10)</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[--border] text-left">
                  {["Time", "Temp (DHT)", "Temp (I2C)", "Humidity", "Soil Moist.", "Light (lux)"].map(h => (
                    <th key={h} className="pb-2.5 pr-5 label-caps !text-[9px] font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 10).map(r => (
                  <tr
                    key={r.created_at}
                    className="border-b border-[--border] last:border-0 cursor-default"
                    onMouseEnter={(e) => {
                      const cells = Array.from(e.currentTarget.querySelectorAll("td"));
                      gsap.to(cells, { backgroundColor: "#1A1714", duration: 0.18, ease: "power2.out", overwrite: true });
                      const hoverColors = ["rgba(240,237,230,0.50)", "#D4993A", "#F0964A", "#3B82F6", "#10B981", "#F59E0B"];
                      cells.forEach((cell, i) => {
                        if (hoverColors[i]) gsap.to(cell, { color: hoverColors[i], duration: 0.18, ease: "power2.out", overwrite: "auto" });
                      });
                    }}
                    onMouseLeave={(e) => {
                      const cells = Array.from(e.currentTarget.querySelectorAll("td"));
                      gsap.to(cells, { backgroundColor: "transparent", duration: 0.32, ease: "power2.inOut", overwrite: true });
                      const restColors = ["#A49E98", "#6A6560", "#6A6560", "#6A6560", "#6A6560", "#6A6560"];
                      cells.forEach((cell, i) => {
                        if (restColors[i]) gsap.to(cell, { color: restColors[i], duration: 0.28, ease: "power2.inOut", overwrite: "auto" });
                      });
                    }}
                  >
                    <td className="py-2.5 pr-5 text-[--text-muted] whitespace-nowrap">{format(new Date(r.created_at), "d MMM HH:mm")}</td>
                    <td className="py-2.5 pr-5 data-num text-[--text-secondary]">{r.temperature !== null ? `${r.temperature}°C` : "—"}</td>
                    <td className="py-2.5 pr-5 data-num text-[--text-secondary]">{r.temp_i2c   !== null ? `${r.temp_i2c}°C`   : "—"}</td>
                    <td className="py-2.5 pr-5 data-num text-[--text-secondary]">{r.humidity   !== null ? `${r.humidity}%`   : "—"}</td>
                    <td className="py-2.5 pr-5 data-num text-[--text-secondary]">{r.moisture   !== null ? `${r.moisture}%`   : "—"}</td>
                    <td className="py-2.5 pr-5 data-num text-[--text-secondary]">{r.light      !== null ? Math.round(r.light) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showExport && (
        <ExportCsvModal
          config={sensorExportConfig}
          onClose={() => setShowExport(false)}
        />
      )}

      {showWeatherExport && (
        <WeatherExportModal
          weather={weather}
          onClose={() => setShowWeatherExport(false)}
        />
      )}
    </div>
  );
}

// ── Weather Export Modal ──────────────────────────────────────────────────────
function WeatherExportModal({ weather, onClose }: { weather: WeatherDaily[]; onClose: () => void }) {
  const [granularity, setGranularity] = useState<"daily" | "hourly">("daily");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const startDate = weather[0]?.forecast_date || format(new Date(), "yyyy-MM-dd");
      const endDate = weather[weather.length - 1]?.forecast_date || format(new Date(), "yyyy-MM-dd");
      const data = granularity === "hourly" 
        ? await fetchWeatherHourly(startDate, endDate)
        : weather;
      downloadCSV(data as unknown as Record<string, unknown>[], `weather_${granularity}_${startDate}_to_${endDate}.csv`);
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface border border-[--border] rounded-[--radius-lg] p-6 w-full max-w-sm shadow-[--shadow-lg]" onClick={e => e.stopPropagation()}>
        <p className="label-caps mb-4">Export Weather Data</p>
        
        <div className="mb-5">
          <label className="label-caps block mb-2">Data granularity</label>
          <div className="flex gap-2">
            <button
              onClick={() => setGranularity("daily")}
              className={`flex-1 py-2 px-3 rounded-[--radius-sm] text-sm font-medium border transition-all ${
                granularity === "daily"
                  ? "bg-[--brand] text-[--text-on-dark] border-[--brand]"
                  : "border-[--border] text-[--text-secondary] hover:bg-[--bg-elevated]"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity("hourly")}
              className={`flex-1 py-2 px-3 rounded-[--radius-sm] text-sm font-medium border transition-all ${
                granularity === "hourly"
                  ? "bg-[--brand] text-[--text-on-dark] border-[--brand]"
                  : "border-[--border] text-[--text-secondary] hover:bg-[--bg-elevated]"
              }`}
            >
              Hourly
            </button>
          </div>
          <p className="text-[11px] text-[--text-muted] mt-2">
            {granularity === "hourly" ? "Includes hourly forecasts (if available)" : "Daily summary data"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" loading={loading} onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
