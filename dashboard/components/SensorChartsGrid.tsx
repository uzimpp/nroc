"use client";

import { useRef, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Thermometer,
  Droplets,
  Sprout,
  Sun,
} from "lucide-react";
import type { SensorReading } from "@/lib/api";

// ── Hourly downsample ────────────────────────────────────────────────────────
interface HourRow {
  time: string;
  temp: number | null;
  temp_i2c: number | null;
  humidity: number | null;
  moisture: number | null;
  light: number | null;
}

function downsample(readings: SensorReading[]): HourRow[] {
  const map = new Map<
    string,
    { t: number[]; i: number[]; h: number[]; m: number[]; l: number[] }
  >();
  for (const r of readings) {
    const d = parseISO(r.created_at);
    d.setMinutes(0, 0, 0);
    const key = format(d, "yyyy-MM-dd'T'HH:00:00");
    if (!map.has(key)) map.set(key, { t: [], i: [], h: [], m: [], l: [] });
    const b = map.get(key)!;
    if (r.temperature !== null) b.t.push(r.temperature);
    if (r.temp_i2c !== null) b.i.push(r.temp_i2c);
    if (r.humidity !== null) b.h.push(r.humidity);
    if (r.moisture !== null) b.m.push(r.moisture);
    if (r.light !== null) b.l.push(r.light);
  }
  const avg = (a: number[]) =>
    a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      time: key,
      temp: avg(b.t),
      temp_i2c: avg(b.i),
      humidity: avg(b.h),
      moisture: avg(b.m),
      light: b.l.length ? Math.round(avg(b.l)!) : null,
    }));
}

// ── Drag-to-pan hook ─────────────────────────────────────────────────────────
function useDragPan(dataLen: number, windowSize: number) {
  const [startIdx, setStartIdx] = useState(() =>
    Math.max(0, dataLen - windowSize),
  );
  const drag = useRef({ active: false, lastX: 0, originStart: 0 });

  // keep startIdx in sync when dataLen changes
  const endIdx = Math.min(startIdx + windowSize - 1, dataLen - 1);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      drag.current = { active: true, lastX: e.clientX, originStart: startIdx };
      e.preventDefault();
    },
    [startIdx],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag.current.active) return;
      const dx = drag.current.lastX - e.clientX;
      drag.current.lastX = e.clientX;
      const shift = Math.round(
        (dx / Math.max(e.currentTarget.clientWidth, 1)) * windowSize * 1.5,
      );
      setStartIdx((prev) =>
        Math.max(0, Math.min(dataLen - windowSize, prev + shift)),
      );
    },
    [dataLen, windowSize],
  );

  const onMouseUp = useCallback(() => {
    drag.current.active = false;
  }, []);

  // touch support
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      drag.current = {
        active: true,
        lastX: e.touches[0].clientX,
        originStart: startIdx,
      };
    },
    [startIdx],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!drag.current.active) return;
      const dx = drag.current.lastX - e.touches[0].clientX;
      drag.current.lastX = e.touches[0].clientX;
      const shift = Math.round(
        (dx / Math.max((e.currentTarget as HTMLElement).clientWidth, 1)) *
          windowSize *
          1.5,
      );
      setStartIdx((prev) =>
        Math.max(0, Math.min(dataLen - windowSize, prev + shift)),
      );
    },
    [dataLen, windowSize],
  );

  const onTouchEnd = useCallback(() => {
    drag.current.active = false;
  }, []);

  return {
    startIdx,
    endIdx,
    setStartIdx,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

// ── Chart styles ─────────────────────────────────────────────────────────────
const AXIS = {
  fontSize: 9,
  fill: "var(--text-muted)",
  fontFamily: "var(--font-dm-mono, monospace)",
};
const tickFmt = (v: string) => {
  try {
    return format(parseISO(v), "d MMM");
  } catch {
    return "";
  }
};
const labelFmt = (v: unknown) => {
  try {
    return format(parseISO(String(v)), "d MMM HH:mm");
  } catch {
    return String(v);
  }
};

// ── MetricChart ──────────────────────────────────────────────────────────────
interface MetricChartProps {
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
  windowSize?: number;
  icon?: React.ReactNode;
}

function MetricChart({
  data,
  label,
  dataKey,
  unit,
  color,
  currentValue,
  domain,
  alertY,
  alertLabel,
  secondKey,
  secondColor,
  secondLabel,
  isAlert,
  windowSize = 96,
  icon,
}: MetricChartProps) {
  const pan = useDragPan(data.length, Math.min(windowSize, data.length));

  return (
    <div
      className={`card card-lift flex flex-col gap-3 p-5 ${isAlert ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="">
          <div className="flex items-center gap-2 mb-1">
            <p className="label-caps">{label}</p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="flex items-center h-full">{icon}</div>
            <span
              className="data-num text-3xl sm:text-4xl font-semibold leading-none"
              style={{ color }}
            >
              {currentValue !== null
                ? currentValue.toFixed(dataKey === "light" ? 0 : 1)
                : "—"}
            </span>
            <span className="text-sm text-[--text-muted]">{unit}</span>
          </div>
        </div>
        {isAlert && (
          <div className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1">
            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-600">
              Alert
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-[--text-muted]">
          No data
        </div>
      ) : (
        <div
          className="cursor-grab active:cursor-grabbing select-none"
          onMouseDown={pan.onMouseDown}
          onMouseMove={pan.onMouseMove}
          onMouseUp={pan.onMouseUp}
          onMouseLeave={pan.onMouseUp}
          onTouchStart={pan.onTouchStart}
          onTouchMove={pan.onTouchMove}
          onTouchEnd={pan.onTouchEnd}
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tickFormatter={tickFmt}
                tick={AXIS}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={AXIS}
                width={38}
                domain={domain ?? ["auto", "auto"]}
                unit={unit.length <= 2 ? unit : ""}
              />
<Tooltip
              labelFormatter={labelFmt}
              content={({ active, payload, label: xLabel }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-black border border-white/10 rounded-[--radius-md] px-4 py-3 shadow-[--shadow-lg] text-xs min-w-[160px]">
                    <p className="text-white/50 text-[10px] pb-2 mb-2 border-b border-white/10">{labelFmt(xLabel)}</p>
                    {payload.map((p) => (
                      <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-white/80">{p.name === String(secondKey) ? (secondLabel ?? p.name) : label}</span>
                        </div>
                        <span className="font-semibold text-white">{p.value !== null ? `${p.value}${unit}` : "—"}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
              <Brush
                dataKey="time"
                height={16}
                stroke="var(--border)"
                fill="var(--bg-elevated)"
                travellerWidth={5}
                startIndex={pan.startIdx}
                endIndex={pan.endIdx}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex !== undefined) pan.setStartIdx(startIndex);
                  if (endIndex !== undefined) {
                    /* endIdx tracks startIdx+window */
                  }
                }}
              />
              {alertY !== undefined && (
                <ReferenceLine
                  y={alertY}
                  stroke="var(--amber)"
                  strokeDasharray="4 3"
                  label={{
                    value: alertLabel,
                    position: "insideTopRight",
                    fontSize: 8,
                    fill: "var(--amber)",
                  }}
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
        </div>
      )}

      <p className="text-[10px] text-[--text-muted] text-center">
        Drag chart to pan · Use brush handles to zoom
      </p>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
interface SensorChartsGridProps {
  readings: SensorReading[];
  windowSize?: number; // default number of hourly points to show at once
}

export default function SensorChartsGrid({
  readings,
  windowSize = 96,
}: SensorChartsGridProps) {
  const data = downsample(readings);

  const latest =
    readings.length > 0
      ? readings.reduce((a, b) => (a.created_at > b.created_at ? a : b))
      : null;

  const temp = latest?.temp_i2c ?? latest?.temperature ?? null;
  const humidity = latest?.humidity ?? null;
  const moisture = latest?.moisture ?? null;
  const light = latest?.light ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <MetricChart
        data={data}
        label="Temperature"
        dataKey="temp_i2c"
        unit="°C"
        color="#E05252"
        secondColor="#F0964A"
        currentValue={temp}
        secondKey="temp"
        secondLabel="DHT Temp"
        windowSize={windowSize}
        icon={<Thermometer size={32} className="text-red-500" />}
      />
      <MetricChart
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
        windowSize={windowSize}
        icon={<Droplets size={32} className="text-blue-500" />}
      />
      <MetricChart
        data={data}
        label="Soil Moisture"
        dataKey="moisture"
        unit="%"
        color="var(--brand-mid)"
        currentValue={moisture}
        domain={[0, 100]}
        alertY={30}
        alertLabel="30% stress"
        isAlert={moisture !== null && moisture < 30}
        windowSize={windowSize}
        icon={<Sprout size={32} className="text-brand" />}
      />
      <MetricChart
        data={data}
        label="Light Intensity"
        dataKey="light"
        unit=" lx"
        color="var(--amber)"
        currentValue={light}
        windowSize={windowSize}
        icon={<Sun size={32} className="text-amber" />}
      />
    </div>
  );
}
