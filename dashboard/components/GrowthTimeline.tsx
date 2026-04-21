"use client";

import { useRef } from "react";
import { format } from "date-fns";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Ruler } from "lucide-react";
import type { GrowthLog } from "@/lib/api";
import { CORN_STAGES } from "@/lib/stages";

gsap.registerPlugin(useGSAP);

export const HARVEST_GDD = 2700;

const AXIS_STYLE = {
  fontSize: 10,
  fill: "var(--text-muted)",
  fontFamily: "var(--font-dm-mono, monospace)",
};

/** Map a stored GDD value to the nearest stage. */
function gddToStage(gdd: number) {
  let best = CORN_STAGES[0];
  for (const s of CORN_STAGES) {
    if (Math.abs(s.gdd - gdd) <= Math.abs(best.gdd - gdd)) best = s;
  }
  return best;
}

/** Custom scatter dot */
function Dot(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  return (
    <circle cx={cx} cy={cy} r={6} fill="var(--brand-mid)" stroke="var(--bg-surface)" strokeWidth={2} />
  );
}

interface ScatterPoint {
  dateMs: number;
  gdd: number;
  dateLabel: string;
  height: number | null;
  ears: number | null;
  notes: string | null;
}

interface ChartTooltipProps { active?: boolean; payload?: { payload: ScatterPoint }[] }

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d     = payload[0].payload;
  const stage = gddToStage(d.gdd);
  const Icon  = stage.icon;
  return (
    <div className="bg-black border border-white/10 rounded-[--radius-md] px-3 py-2.5 shadow-[--shadow-lg] text-xs space-y-1.5 max-w-[220px]">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-brand-light shrink-0" />
        <p className="font-semibold text-white">{stage.label} — {stage.desc}</p>
      </div>
      <p className="data-num text-surface">{d.gdd} GDD</p>
      <p className="text-white/50">{d.dateLabel}</p>
      {d.height && (
        <p className="text-white/70 flex items-center gap-1">
          <Ruler size={10} />{d.height} cm
        </p>
      )}
      {d.ears  && <p className="text-white/70">{d.ears} ears</p>}
      {d.notes && <p className="italic text-white/50">{d.notes}</p>}
    </div>
  );
}

/* Reference lines — only show key milestones to avoid clutter */
const KEY_STAGES = CORN_STAGES.filter(s =>
  ["plant", "VE", "V6", "VT", "R1", "R3", "R5", "R6"].includes(s.id)
);

/* Y-axis tick positions */
const Y_TICKS = KEY_STAGES.map(s => s.gdd);

export default function GrowthTimeline({ logs }: { logs: GrowthLog[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const points: ScatterPoint[] = sorted.map(log => ({
    dateMs:    new Date(log.created_at).getTime(),
    gdd:       log.growth_progress_in_gdd || 0,
    dateLabel: format(new Date(log.created_at), "d MMM yyyy"),
    height:    log.height,
    ears:      log.n_ears,
    notes:     log.notes,
  }));

  const tickFmtX = (ms: number) => {
    try { return format(new Date(ms), "d MMM"); } catch { return ""; }
  };

  useGSAP(() => {
    // Stage pills stagger in one-by-one
    gsap.from(".stage-pill", {
      scale: 0.7, opacity: 0, stagger: 0.04, duration: 0.35,
      ease: "back.out(1.6)", delay: 0.1,
    });
    // Observation entries slide up sequentially
    gsap.from(".event-entry", { y: 20, opacity: 0, stagger: 0.07, duration: 0.5, ease: "power2.out", delay: 0.2 });
  }, { scope: ref, dependencies: [logs.length] });

  return (
    <div ref={ref}>
      {/* Stage reference legend */}
      <div className="mb-5">
        <p className="label-caps mb-3">Stage Reference</p>
        <div className="flex flex-wrap gap-1.5">
          {CORN_STAGES.filter(s => s.id !== "harvest").map(s => {
            const Icon = s.icon;
            const isV  = s.group === "vegetative";
            return (
              <span
                key={s.id}
                className={`stage-pill inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border
                  ${isV
                    ? "bg-[--brand-light] border-[--brand-light] text-[--brand]"
                    : "bg-[--amber-light] border-[--amber-light] text-[--amber]"}`}
                title={`${s.desc} — ${s.gdd} GDD${s.detail ? ` | ${s.detail}` : ""}`}
              >
                <Icon size={9} />
                {s.label}
                <span className="opacity-60">{s.gdd}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Scatter chart ───────────────────────────────────────────────── */}
      <p className="label-caps mb-4">Stage Milestones (GDD over Time)</p>

      {points.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-[--text-muted] bg-[--bg-elevated] rounded-[--radius-md]">
          No observations logged yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart margin={{ top: 8, right: 120, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dateMs"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={tickFmtX}
              tick={AXIS_STYLE}
              tickCount={5}
              name="Date"
            />
            <YAxis
              dataKey="gdd"
              type="number"
              domain={[0, 2800]}
              ticks={Y_TICKS}
              tick={AXIS_STYLE}
              width={44}
              name="GDD"
            />
            <Tooltip content={<ChartTooltip />} />

            {/* Reference lines for key stages only */}
            {KEY_STAGES.map(s => (
              <ReferenceLine
                key={s.id}
                y={s.gdd}
                stroke={s.group === "reproductive" ? "var(--amber)" : "var(--border-strong)"}
                strokeDasharray="4 3"
                strokeOpacity={s.group === "reproductive" ? 0.5 : 0.8}
                label={{
                  value: `${s.label}`,
                  position: "right",
                  fontSize: 9,
                  fill: s.group === "reproductive" ? "var(--amber)" : "var(--text-muted)",
                  offset: 4,
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="gdd"
              data={points}
              stroke="var(--brand-mid)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Scatter data={points} shape={<Dot />} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Event log ──────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="mt-8">
          <p className="label-caps mb-4">Observation Log</p>
          <div className="relative pl-5">
            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[--border]" />
            <div className="flex flex-col gap-3">
              {[...sorted].reverse().map((log, i) => {
                const isLatest  = i === 0;
                const gdd       = log.growth_progress_in_gdd || 0;
                const stage     = gddToStage(gdd);
                const StageIcon = stage.icon;
                const isRepro   = stage.group === "reproductive";
                return (
                  <div key={log.id} className="event-entry relative">
                    <div className={`absolute -left-[14px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-[--bg-surface]
                      ${isLatest
                        ? isRepro ? "bg-[--amber-mid]" : "bg-[--brand-mid]"
                        : "bg-[--border-strong]"}`}
                    />
                    <div className={`rounded-[--radius-md] border p-3
                      ${isLatest
                        ? isRepro
                          ? "border-[--amber-light] bg-[--amber-light]"
                          : "border-[--brand-light] bg-[--brand-light]"
                        : "bg-[--bg-surface] border-[--border]"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <p className="label-caps">{format(new Date(log.created_at), "d MMM yyyy")}</p>
                        <span className={`flex items-center gap-1.5 data-num text-xs font-semibold px-2 py-0.5 rounded-full border
                          ${isRepro
                            ? "text-[--amber] bg-[--bg-surface] border-[--amber-light]"
                            : "text-[--brand-mid] bg-[--bg-surface] border-[--brand-light]"}`}
                        >
                          <StageIcon size={11} />
                          {stage.label} · {gdd} GDD
                        </span>
                      </div>
                      <p className="text-[10px] text-[--text-muted] mb-1.5">{stage.desc}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-[--text-secondary]">
                        {log.height && (
                          <span className="flex items-center gap-1">
                            <Ruler size={11} className="text-[--text-muted]" />{log.height} cm
                          </span>
                        )}
                        {log.n_ears && <span>{log.n_ears} ears</span>}
                        {log.notes  && <span className="italic text-[--text-muted]">{log.notes}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
