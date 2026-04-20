"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays, addDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Download } from "lucide-react";
import {
  fetchSensors, fetchWeatherDaily,
  type SensorReading, type WeatherDaily,
} from "@/lib/api";
import { downloadCSV, todayStr } from "@/lib/csv";
import SensorChart, { type Range } from "@/components/SensorChart";
import WeatherForecast from "@/components/WeatherForecast";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const RANGE_DAYS: Record<Range, number> = { "7D": 7, "14D": 14, "30D": 30 };

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

interface PillProps { label: string; value: string; unit: string; color: string; }
function SummaryPill({ label, value, unit, color }: PillProps) {
  return (
    <div className={`summary-pill rounded-[--radius-md] px-4 py-2.5 flex flex-col gap-0.5 ${color}`}>
      <p className="label-caps !text-[9px] opacity-60">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="data-num text-lg font-semibold">{value}</span>
        <span className="text-[11px] opacity-50">{unit}</span>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const [readings, setReadings]     = useState<SensorReading[]>([]);
  const [weather, setWeather]       = useState<WeatherDaily[]>([]);
  const [range, setRange]           = useState<Range>("7D");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const page = useRef<HTMLDivElement>(null);

  const load = useCallback(async (r: Range) => {
    setError("");
    const now    = new Date();
    const start  = subDays(now, RANGE_DAYS[r]);
    const future = addDays(now, 7);
    try {
      const [sens, wx] = await Promise.all([
        fetchSensors(start.toISOString(), now.toISOString()),
        fetchWeatherDaily(isoDate(now), isoDate(future)),
      ]);
      setReadings(sens);
      setWeather(wx);
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
    ScrollTrigger.batch(".animate-section", {
      onEnter: els => gsap.from(els, { y: 40, opacity: 0, stagger: 0.12, duration: 0.7, ease: "power2.out" }),
      once: true, start: "top 88%",
    });
  }, { scope: page });

  function periodAvg(field: keyof SensorReading) {
    const vals = readings.map(r => r[field] as number | null).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const avgTemp  = periodAvg("temperature");
  const avgHum   = periodAvg("humidity");
  const avgMoist = periodAvg("moisture");
  const avgLight = periodAvg("light");
  const latestTime = readings[0] ? format(new Date(readings[0].created_at), "d MMM HH:mm") : "—";

  return (
    <div ref={page} className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

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
              onClick={() => downloadCSV(readings as unknown as Record<string, unknown>[], `sensor_data_${todayStr()}.csv`)}
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
          <SummaryPill label="Avg Temp"     value={avgTemp  !== null ? avgTemp.toFixed(1)  : "—"} unit="°C"   color="bg-red-50 text-red-700" />
          <SummaryPill label="Avg Humidity" value={avgHum   !== null ? avgHum.toFixed(1)   : "—"} unit="%"    color="bg-blue-50 text-blue-700" />
          <SummaryPill label="Avg Soil"     value={avgMoist !== null ? avgMoist.toFixed(1) : "—"} unit="%"    color="bg-[--brand-light] text-[--brand]" />
          <SummaryPill label="Avg Light"    value={avgLight !== null ? Math.round(avgLight).toString() : "—"} unit="lux" color="bg-amber-50 text-amber-700" />
          <SummaryPill label="Readings"     value={readings.length.toString()} unit="pts"  color="bg-[--bg-elevated] text-[--text-secondary]" />
        </div>
      )}

      {/* Sensor chart */}
      <div className="animate-section">
        {loading ? (
          <div className="h-96 rounded-[--radius-lg] bg-[--bg-elevated] animate-pulse" />
        ) : (
          <SensorChart readings={readings} range={range} onRangeChange={handleRange} />
        )}
      </div>

      {/* Weather forecast */}
      <div className="animate-section">
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
                  <tr key={r.id} className="border-b border-[--border] last:border-0 hover:bg-[--bg-elevated] transition-colors">
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
    </div>
  );
}
