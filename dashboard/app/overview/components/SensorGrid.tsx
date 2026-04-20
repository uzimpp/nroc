"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Brush,
} from "recharts";
import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { fetchSensors } from "@/lib/api";
import { downloadCSV } from "@/lib/csv";
import type { SensorReading } from "@/lib/api";
import Button from "@/components/ui/Button";

// ── Hourly downsampling ───────────────────────────────────────────────────────
interface HourRow {
  time: string;
  temp: number | null;
  temp_i2c: number | null;
  humidity: number | null;
  moisture: number | null;
  light: number | null;
}

function downsample(readings: SensorReading[]): HourRow[] {
  const map = new Map<string, { t: number[]; i: number[]; h: number[]; m: number[]; l: number[] }>();
  for (const r of readings) {
    const d = parseISO(r.created_at);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    if (!map.has(key)) map.set(key, { t: [], i: [], h: [], m: [], l: [] });
    const b = map.get(key)!;
    if (r.temperature !== null) b.t.push(r.temperature);
    if (r.temp_i2c   !== null) b.i.push(r.temp_i2c);
    if (r.humidity   !== null) b.h.push(r.humidity);
    if (r.moisture   !== null) b.m.push(r.moisture);
    if (r.light      !== null) b.l.push(r.light);
  }
  const avg = (a: number[]) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      time:     key,
      temp:     avg(b.t),
      temp_i2c: avg(b.i),
      humidity: avg(b.h),
      moisture: avg(b.m),
      light:    b.l.length ? Math.round(avg(b.l)!) : null,
    }));
}

// ── Single metric chart card ──────────────────────────────────────────────────
interface MetricCardProps {
  data: HourRow[];
  label: string;
  dataKey: keyof HourRow;
  unit: string;
  color: string;
  currentValue: number | null;
  domain?: [number | string, number | string];
  alertY?: number;
  alertLabel?: string;
  secondKey?: keyof HourRow;
  secondColor?: string;
  secondLabel?: string;
  isAlert?: boolean;
}

const AXIS = { fontSize: 9, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono, monospace)" };
const tickFmt  = (v: string) => { try { return format(parseISO(v), "d MMM"); } catch { return ""; } };
const labelFmt = (v: unknown) => { try { return format(parseISO(String(v)), "d MMM HH:mm"); } catch { return String(v); } };

function MetricCard({
  data, label, dataKey, unit, color, currentValue,
  domain, alertY, alertLabel, secondKey, secondColor, secondLabel, isAlert,
}: MetricCardProps) {
  const startIdx = Math.max(0, data.length - 96); // show last 4 days by default

  return (
    <div className={`card card-lift flex flex-col gap-3 p-5 ${isAlert ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-caps mb-1">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span
              className="data-num text-3xl sm:text-4xl font-semibold leading-none"
              style={{ color }}
            >
              {currentValue !== null ? currentValue.toFixed(dataKey === "light" ? 0 : 1) : "—"}
            </span>
            <span className="text-sm text-[--text-muted]">{unit}</span>
          </div>
        </div>
        {isAlert && (
          <div className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1">
            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-600">Alert</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-[--text-muted]">
          No data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" tickFormatter={tickFmt} tick={AXIS} interval="preserveStartEnd" minTickGap={50} />
            <YAxis
              tick={AXIS}
              width={38}
              domain={domain ?? ["auto", "auto"]}
              unit={unit.length <= 2 ? unit : ""}
            />
            <Tooltip
              labelFormatter={labelFmt}
              formatter={(v, name) => [
                v !== null ? `${v}${unit}` : "—",
                name === String(secondKey) ? (secondLabel ?? name) : label,
              ]}
            />
            <Brush
              dataKey="time"
              height={18}
              stroke="var(--border)"
              fill="var(--bg-elevated)"
              travellerWidth={5}
              startIndex={startIdx}
            />
            {alertY !== undefined && (
              <ReferenceLine
                y={alertY}
                stroke="var(--amber)"
                strokeDasharray="4 3"
                label={{ value: alertLabel, position: "insideTopRight", fontSize: 8, fill: "var(--amber)" }}
              />
            )}
            <Line
              type="monotone"
              dataKey={String(dataKey)}
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 3 }}
            />
            {secondKey && (
              <Line
                type="monotone"
                dataKey={String(secondKey)}
                stroke={secondColor}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Grid of 4 charts ─────────────────────────────────────────────────────────
export default function SensorGrid({
  readings,
  plantingDate,
}: {
  readings: SensorReading[];
  plantingDate: string;
}) {
  const data = downsample(readings);

  const latest = readings.length > 0
    ? readings.reduce((a, b) => a.created_at > b.created_at ? a : b)
    : null;

  const temp     = latest?.temp_i2c ?? latest?.temperature ?? null;
  const humidity = latest?.humidity ?? null;
  const moisture = latest?.moisture ?? null;
  const light    = latest?.light ?? null;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-caps">Sensor History</p>
            <p className="text-[11px] text-[--text-muted] mt-0.5">
              Drag the brush handle to pan through history
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            data={data}
            label="Temperature"
            dataKey="temp"
            unit="°C"
            color="#E05252"
            currentValue={temp}
            secondKey="temp_i2c"
            secondColor="#F0964A"
            secondLabel="I2C Temp"
          />
          <MetricCard
            data={data}
            label="Humidity"
            dataKey="humidity"
            unit="%"
            color="#3B82F6"
            currentValue={humidity}
            domain={[0, 100]}
            alertY={80}
            alertLabel="80% disease risk"
            isAlert={humidity !== null && humidity > 80}
          />
          <MetricCard
            data={data}
            label="Soil Moisture"
            dataKey="moisture"
            unit="%"
            color="var(--brand-mid)"
            currentValue={moisture}
            domain={[0, 100]}
            alertY={30}
            alertLabel="30% stress threshold"
            isAlert={moisture !== null && moisture < 30}
          />
          <MetricCard
            data={data}
            label="Light Intensity"
            dataKey="light"
            unit=" lx"
            color="var(--amber)"
            currentValue={light}
          />
        </div>
      </div>
    </>
  );
}
