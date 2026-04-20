"use client";

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { CORN_STAGES } from "@/components/GrowthLogForm";
import type { SensorReading, GrowthLog } from "@/lib/api";
import Card from "@/components/ui/Card";

// ── Stage reference lines ────────────────────────────────────────────────────
// Deduplicate by GDD value, skip "plant" (0) and "harvest" (duplicate of R6)
const LABELED_IDS = new Set(["VE", "V6", "V12", "VT", "R1", "R3", "R6"]);
const STAGE_LINES = CORN_STAGES
  .filter(s => s.id !== "plant" && s.id !== "harvest")
  .filter((s, i, arr) => arr.findIndex(x => x.gdd === s.gdd) === i);

// ── GDD accumulation from sensor readings ───────────────────────────────────
function buildSensorGdd(readings: SensorReading[], plantingIso: string): Map<string, number> {
  const byDay = new Map<string, number[]>();
  for (const r of readings) {
    const d = r.created_at.slice(0, 10);
    if (d < plantingIso) continue;
    const temp = r.temp_i2c ?? r.temperature;
    if (temp !== null) {
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(temp);
    }
  }
  let cum = 0;
  const result = new Map<string, number>();
  for (const [date, temps] of Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    cum += Math.max(0, avg - 10);
    result.set(date, +cum.toFixed(1));
  }
  return result;
}

// ── Merge sensor GDD + logged GDD into a single series ──────────────────────
interface ChartRow {
  date: string;
  sensorGdd: number | null;
  loggedGdd: number | null;
}

function buildChartData(
  readings: SensorReading[],
  logs: GrowthLog[],
  plantingIso: string,
): ChartRow[] {
  const sensorMap = buildSensorGdd(readings, plantingIso);

  const loggedMap = new Map<string, number>();
  for (const log of logs) {
    const d = (log.created_at ?? "").slice(0, 10);
    const gdd = parseFloat(log.growth_progress_in_gdd);
    if (!isNaN(gdd)) loggedMap.set(d, gdd);
  }

  const allDates = new Set([...sensorMap.keys(), ...loggedMap.keys()]);
  return Array.from(allDates)
    .sort()
    .map(date => ({
      date,
      sensorGdd: sensorMap.get(date) ?? null,
      loggedGdd: loggedMap.get(date) ?? null,
    }));
}

const AXIS_STYLE = { fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono, monospace)" };
const dateFmt = (v: string) => { try { return format(parseISO(v), "d MMM"); } catch { return v; } };

export default function GddChart({
  readings,
  logs,
  plantingIso,
}: {
  readings: SensorReading[];
  logs: GrowthLog[];
  plantingIso: string;
}) {
  const data = buildChartData(readings, logs, plantingIso);

  if (data.length === 0) {
    return (
      <Card noPad className="p-6">
        <p className="label-caps mb-3">GDD Growth Curve</p>
        <div className="h-64 flex items-center justify-center text-sm text-[--text-muted]">
          No sensor data yet. Log a planting date to begin.
        </div>
      </Card>
    );
  }

  const maxGdd = Math.max(
    ...data.map(d => Math.max(d.sensorGdd ?? 0, d.loggedGdd ?? 0)),
    500,
  );
  const yMax = Math.min(2700, Math.ceil(maxGdd / 100) * 100 + 200);

  return (
    <Card noPad className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-caps">GDD Growth Curve</p>
          <p className="text-[11px] text-[--text-muted] mt-0.5">
            Blue — sensor accumulated &middot; Orange dots — field observations
          </p>
        </div>
        <span className="label-caps text-[--text-muted] text-[10px]">Base 10 °C &middot; 2,700 GDD to R6</span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 72, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={dateFmt}
            tick={AXIS_STYLE}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tick={AXIS_STYLE}
            width={48}
            domain={[0, yMax]}
            tickFormatter={v => `${v}`}
          />
          <Tooltip
            labelFormatter={v => { try { return format(parseISO(String(v)), "d MMM yyyy"); } catch { return String(v); } }}
            formatter={(v, name) => [
              v !== null ? `${Number(v).toFixed(1)} GDD` : "—",
              name === "sensorGdd" ? "Sensor GDD" : "Logged GDD",
            ]}
          />
          <Legend
            wrapperStyle={AXIS_STYLE}
            formatter={v => v === "sensorGdd" ? "Sensor (daily acc.)" : "Logged observation"}
          />

          {/* Stage reference lines */}
          {STAGE_LINES.map(s => {
            const labeled = LABELED_IDS.has(s.id);
            const isR3 = s.id === "R3";
            return (
              <ReferenceLine
                key={s.id}
                y={s.gdd}
                stroke={isR3 ? "var(--amber)" : labeled ? "var(--brand-mid)" : "var(--border-strong)"}
                strokeDasharray={labeled ? "5 3" : "2 4"}
                strokeOpacity={labeled ? 0.7 : 0.35}
                strokeWidth={isR3 ? 1.5 : 1}
                label={labeled ? {
                  value: isR3 ? `${s.label} Harvest` : s.label,
                  position: "insideRight",
                  fontSize: 9,
                  fill: isR3 ? "var(--amber)" : "var(--text-muted)",
                  fontFamily: "var(--font-dm-mono, monospace)",
                } : undefined}
              />
            );
          })}

          {/* Sensor-calculated GDD — continuous line */}
          <Line
            type="monotone"
            dataKey="sensorGdd"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 4 }}
          />

          {/* Logged observations — dots + connecting line */}
          <Line
            type="monotone"
            dataKey="loggedGdd"
            stroke="var(--amber)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={{ r: 5, fill: "var(--amber)", strokeWidth: 2, stroke: "white" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
