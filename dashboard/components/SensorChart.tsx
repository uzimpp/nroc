"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Thermometer, Droplets, Sprout, Sun } from "lucide-react";
import type { SensorReading } from "@/lib/api";
import Card from "./ui/Card";

export type Range = "7D" | "14D" | "30D";
type Tab = "temp" | "humidity" | "moisture" | "light";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "temp", label: "Temperature", icon: <Thermometer size={16} /> },
  { id: "humidity", label: "Humidity", icon: <Droplets size={16} /> },
  { id: "moisture", label: "Soil", icon: <Sprout size={16} /> },
  { id: "light", label: "Light", icon: <Sun size={16} /> },
];
const RANGES: Range[] = ["7D", "14D", "30D"];

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function downsample(readings: SensorReading[]) {
  const map = new Map<
    string,
    {
      temps: number[];
      i2c: number[];
      hums: number[];
      moist: number[];
      lights: number[];
    }
  >();
  for (const r of readings) {
    const d = parseISO(r.created_at);
    d.setMinutes(0, 0, 0);
    const key = format(d, "yyyy-MM-dd'T'HH:00:00");
    if (!map.has(key))
      map.set(key, { temps: [], i2c: [], hums: [], moist: [], lights: [] });
    const b = map.get(key)!;
    if (r.temperature !== null) b.temps.push(r.temperature);
    if (r.temp_i2c !== null) b.i2c.push(r.temp_i2c);
    if (r.humidity !== null) b.hums.push(r.humidity);
    if (r.moisture !== null) b.moist.push(r.moisture);
    if (r.light !== null) b.lights.push(r.light);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      time: key,
      temp: avg(b.temps) !== null ? +avg(b.temps)!.toFixed(1) : null,
      temp_i2c: avg(b.i2c) !== null ? +avg(b.i2c)!.toFixed(2) : null,
      humidity: avg(b.hums) !== null ? +avg(b.hums)!.toFixed(1) : null,
      moisture: avg(b.moist) !== null ? +avg(b.moist)!.toFixed(1) : null,
      light: avg(b.lights) !== null ? +avg(b.lights)!.toFixed(0) : null,
    }));
}

const tickFmt = (v: string) => {
  try {
    return format(parseISO(v), "d MMM HH:mm");
  } catch {
    return v;
  }
};
const labelFmt = (v: unknown) => {
  try {
    return format(parseISO(String(v)), "d MMM yyyy HH:mm");
  } catch {
    return String(v);
  }
};
const AXIS_STYLE = {
  fontSize: 10,
  fill: "var(--text-muted)",
  fontFamily: "var(--font-dm-mono, monospace)",
};
const BEGIN_COLOR = "#10B981";

export default function SensorChart({
  readings,
  range,
  onRangeChange,
}: {
  readings: SensorReading[];
  range: Range;
  onRangeChange: (r: Range) => void;
}) {
  const [tab, setTab] = useState<Tab>("temp");
  const data = downsample(readings);

  return (
    <Card noPad className="p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-sm] text-[13px] font-medium transition-all duration-150
                ${
                  tab === t.id
                    ? "bg-[--brand] text-[--text-on-dark]"
                    : "text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary]"
                }
              `}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex rounded-[--radius-sm] border border-[--border] overflow-hidden">
          {RANGES.map(r => (
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
        {data.length > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium">
            {tab === "temp" && (
              <>
                <Thermometer size={14} className="text-red-500" />
                <span className="text-red-600">{data[data.length - 1]?.temp}°C</span>
                <span className="text-[--text-muted]">/</span>
                <Thermometer size={14} className="text-orange-400 opacity-70" />
                <span className="text-orange-500">{data[data.length - 1]?.temp_i2c}°C</span>
              </>
            )}
            {tab === "humidity" && (
              <>
                <Droplets size={14} className="text-blue-500" />
                <span className="text-blue-600">{data[data.length - 1]?.humidity}%</span>
              </>
            )}
            {tab === "moisture" && (
              <>
                <Sprout size={14} className="text-emerald-500" />
                <span className="text-emerald-600">{data[data.length - 1]?.moisture}%</span>
              </>
            )}
            {tab === "light" && (
              <>
                <Sun size={14} className="text-amber-500" />
                <span className="text-amber-600">{data[data.length - 1]?.light} lux</span>
              </>
            )}
          </div>
)}
        </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[--text-muted]">
          No sensor data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          {tab === "temp" ? (
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickFormatter={tickFmt}
                tick={AXIS_STYLE}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={AXIS_STYLE}
                unit="°C"
                width={42}
                domain={["auto", "auto"]}
              />
              <Tooltip
                labelFormatter={labelFmt}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
                      <p className="text-[--text-muted] text-[10px] pb-2 mb-2 border-b border-white/10">
                        {d?.time ? tickFmt(d.time) : label}
                      </p>
                      {payload.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-white/80">{p.name}</span>
                          </div>
                          <span className="font-semibold text-white">{p.value}°C</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={AXIS_STYLE}
                formatter={(value) => {
                  const icons: Record<string, React.ReactNode> = {
                    "Temperature": (
                      <>
                        <Thermometer size={12} className="inline mr-1" />
                        Temperature
                      </>
                    ),
                    "Temperature (I2C)": (
                      <>
                        <Thermometer
                          size={12}
                          className="inline mr-1 opacity-70"
                        />
                        Temperature (I2C)
                      </>
                    ),
                  };
                  return icons[value] || value;
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                name="Temperature"
                stroke="#E05252"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="temp_i2c"
                name="Temperature (I2C)"
                stroke="#F0964A"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                strokeDasharray="4 2"
              />
              {data[0] && (
                <ReferenceLine
                  x={data[0].time}
                  stroke={BEGIN_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          ) : tab === "humidity" ? (
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickFormatter={tickFmt}
                tick={AXIS_STYLE}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis tick={AXIS_STYLE} unit="%" width={38} domain={[0, 100]} />
              <Tooltip
                labelFormatter={labelFmt}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
                      <p className="text-[--text-muted] text-[10px] pb-2 mb-2 border-b border-white/10">
                        {d?.time ? tickFmt(d.time) : label}
                      </p>
                      {payload.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                          <div className="flex items-center gap-2">
                            <Droplets size={12} className="text-blue-500" />
                            <span className="text-white/80">{p.name === "Humidity" ? "Air Humidity" : p.name}</span>
                          </div>
                          <span className="font-semibold text-white">{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={AXIS_STYLE}
                formatter={(value) => (
                  <>
                    <Droplets size={12} className="inline mr-1" />
                    {value}
                  </>
                )}
              />
              <ReferenceLine
                y={80}
                stroke="var(--amber)"
                strokeDasharray="4 3"
                label={{
                  value: "80% risk",
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "var(--amber)",
                }}
              />
              <Line
                type="monotone"
                dataKey="humidity"
                name="Humidity"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {data[0] && (
                <ReferenceLine
                  x={data[0].time}
                  stroke={BEGIN_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          ) : tab === "moisture" ? (
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickFormatter={tickFmt}
                tick={AXIS_STYLE}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis tick={AXIS_STYLE} unit="%" width={38} domain={[0, 100]} />
              <Tooltip
                labelFormatter={labelFmt}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
                      <p className="text-[--text-muted] text-[10px] pb-2 mb-2 border-b border-white/10">
                        {d?.time ? tickFmt(d.time) : label}
                      </p>
                      {payload.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                          <div className="flex items-center gap-2">
                            <Sprout size={12} className="text-emerald-500" />
                            <span className="text-white/80">{p.name === "Soil Moisture" ? "Soil Moisture" : p.name}</span>
                          </div>
                          <span className="font-semibold text-white">{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={AXIS_STYLE}
                formatter={(value) => (
                  <>
                    <Sprout size={12} className="inline mr-1" />
                    {value}
                  </>
                )}
              />
              <ReferenceLine
                y={30}
                stroke="var(--amber)"
                strokeDasharray="4 3"
                label={{
                  value: "30% stress",
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "var(--amber)",
                }}
              />
              <Line
                type="monotone"
                dataKey="moisture"
                name="Soil Moisture"
                stroke="var(--brand-mid)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {data[0] && (
                <ReferenceLine
                  x={data[0].time}
                  stroke={BEGIN_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickFormatter={tickFmt}
                tick={AXIS_STYLE}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={AXIS_STYLE}
                unit=" lx"
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                labelFormatter={labelFmt}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
                      <p className="text-[--text-muted] text-[10px] pb-2 mb-2 border-b border-white/10">
                        {d?.time ? tickFmt(d.time) : label}
                      </p>
                      {payload.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                          <div className="flex items-center gap-2">
                            <Sun size={12} className="text-amber-500" />
                            <span className="text-white/80">{p.name === "Light" ? "Light Intensity" : p.name}</span>
                          </div>
                          <span className="font-semibold text-white">{p.value} lux</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={AXIS_STYLE}
                formatter={(value) => (
                  <>
                    <Sun size={12} className="inline mr-1" />
                    {value}
                  </>
                )}
              />
              <Line
                type="monotone"
                dataKey="light"
                name="Light"
                stroke="var(--amber)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {data[0] && (
                <ReferenceLine
                  x={data[0].time}
                  stroke={BEGIN_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </Card>
  );
}
