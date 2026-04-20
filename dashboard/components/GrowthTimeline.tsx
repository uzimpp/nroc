"use client";

import { useRef } from "react";
import { format, parseISO } from "date-fns";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  CircleDot, Sprout, Leaf, Wheat, FlaskConical, Scissors, Ruler,
} from "lucide-react";
import type { GrowthLog } from "@/lib/api";

gsap.registerPlugin(useGSAP);

// Corrected thresholds for tropical sweet corn (base 10 °C, modified method: T_max capped at 30 °C)
export const HARVEST_GDD = 750;

export const STAGES = [
  { gdd: 0,   Icon: CircleDot,    label: "Plant",   desc: "Planting date"        },
  { gdd: 100, Icon: Sprout,       label: "VE",      desc: "Emergence"            },
  { gdd: 200, Icon: Leaf,         label: "V4",      desc: "4-leaf stage"         },
  { gdd: 350, Icon: Leaf,         label: "V8",      desc: "8-leaf stage"         },
  { gdd: 560, Icon: Wheat,        label: "VT/R1",   desc: "Tasseling / Silking"  },
  { gdd: 720, Icon: FlaskConical, label: "R3",      desc: "Milk stage — harvest" },
  { gdd: 750, Icon: Scissors,     label: "Harvest", desc: "Ready to harvest"     },
] as const;

const AXIS_STYLE = { fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-dm-mono, monospace)" };

type Stage = typeof STAGES[number];

/** Map a stored GDD value to the nearest stage. */
function gddToStage(gdd: number): Stage {
  let best: Stage = STAGES[0];
  for (const s of STAGES) {
    if (Math.abs(s.gdd - gdd) <= Math.abs(best.gdd - gdd)) best = s;
  }
  return best;
}

/** Custom scatter dot — tiny filled circle with brand colour */
function Dot(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  return <circle cx={cx} cy={cy} r={6} fill="var(--brand-mid)" stroke="var(--bg-surface)" strokeWidth={2} />;
}

interface ChartTooltipProps { active?: boolean; payload?: { payload: ScatterPoint }[] }

/** Custom tooltip */
function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const stage = gddToStage(d.gdd);
  return (
    <div className="bg-[--bg-surface] border border-[--border] rounded-[--radius-md] px-3 py-2.5 shadow-[--shadow-md] text-xs space-y-1 max-w-[200px]">
      <p className="font-semibold text-[--text-primary]">{stage.label} — {stage.desc}</p>
      <p className="data-num text-[--brand-mid]">{d.gdd} GDD</p>
      <p className="text-[--text-muted]">{d.dateLabel}</p>
      {d.height && <p className="text-[--text-secondary] flex items-center gap-1"><Ruler size={10} />{d.height} cm</p>}
      {d.ears   && <p className="text-[--text-secondary]">{d.ears} ears</p>}
      {d.notes  && <p className="italic text-[--text-muted]">{d.notes}</p>}
    </div>
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

export default function GrowthTimeline({ logs }: { logs: GrowthLog[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const points: ScatterPoint[] = sorted.map(log => ({
    dateMs:    new Date(log.created_at).getTime(),
    gdd:       parseFloat(log.growth_progress_in_gdd) || 0,
    dateLabel: format(new Date(log.created_at), "d MMM yyyy"),
    height:    log.height,
    ears:      log.n_ears,
    notes:     log.notes,
  }));

  // X-axis tick formatter
  const tickFmtX = (ms: number) => {
    try { return format(new Date(ms), "d MMM"); } catch { return ""; }
  };

  useGSAP(() => {
    gsap.from(".event-entry", { y: 20, opacity: 0, stagger: 0.07, duration: 0.5, ease: "power2.out" });
  }, { scope: ref, dependencies: [logs.length] });

  return (
    <div ref={ref}>
      {/* ── Scatter chart ─────────────────────────────────────────────────── */}
      <p className="label-caps mb-4">Stage Milestones</p>

      {points.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-[--text-muted] bg-[--bg-elevated] rounded-[--radius-md]">
          No observations logged yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 100, left: 0, bottom: 4 }}>
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
              domain={[0, 800]}
              ticks={[0, 100, 200, 350, 560, 720, 750]}
              tick={AXIS_STYLE}
              width={36}
              name="GDD"
            />
            <Tooltip content={<ChartTooltip />} />

            {/* Reference lines for each stage */}
            {STAGES.map(s => (
              <ReferenceLine
                key={s.gdd}
                y={s.gdd}
                stroke="var(--border-strong)"
                strokeDasharray="4 3"
                label={{
                  value: `${s.label} — ${s.desc}`,
                  position: "right",
                  fontSize: 9,
                  fill: "var(--text-muted)",
                  offset: 4,
                }}
              />
            ))}

            <Scatter data={points} shape={<Dot />} />
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {/* ── Event log ─────────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="mt-8">
          <p className="label-caps mb-4">Observation Log</p>
          <div className="relative pl-5">
            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[--border]" />
            <div className="flex flex-col gap-3">
              {sorted.map((log, i) => {
                const isLatest = i === sorted.length - 1;
                const gdd = parseFloat(log.growth_progress_in_gdd) || 0;
                const stage = gddToStage(gdd);
                const StageIcon = stage.Icon;
                return (
                  <div key={log.id} className="event-entry relative">
                    <div className={`absolute -left-[14px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-[--bg-surface] ${isLatest ? "bg-[--brand-mid]" : "bg-[--border-strong]"}`} />
                    <div className={`rounded-[--radius-md] border p-3 ${isLatest ? "border-[--brand-light] bg-[--brand-light]" : "bg-[--bg-surface] border-[--border]"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="label-caps">{format(new Date(log.created_at), "d MMM yyyy")}</p>
                        <span className="flex items-center gap-1.5 data-num text-xs font-semibold text-[--brand-mid] bg-[--bg-surface] border border-[--brand-light] px-2 py-0.5 rounded-full">
                          <StageIcon size={11} />
                          {stage.label} · {gdd} GDD
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[--text-secondary]">
                        {log.height && (
                          <span className="flex items-center gap-1"><Ruler size={11} className="text-[--text-muted]" />{log.height} cm</span>
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
