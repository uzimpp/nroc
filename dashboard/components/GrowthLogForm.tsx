"use client";

import { useState } from "react";
import {
  CircleDot, Sprout, Leaf, Wheat, FlaskConical, Scissors,
  Sun, Droplets, Layers, ChevronDown,
} from "lucide-react";
import { postGrowthLog } from "@/lib/api";
import Button from "./ui/Button";

interface Props { farmId: string; onSuccess: () => void; onClose: () => void; }

const INPUT = `w-full rounded-[--radius-sm] border border-[--border] bg-[--bg-elevated]
  px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted]
  focus:outline-none focus:ring-2 focus:ring-[--brand-mid] focus:border-transparent
  focus:bg-[--bg-surface] transition-all`;

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-caps block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[--text-muted]">{hint}</p>}
    </div>
  );
}

/* ── Complete USDA/standard corn growth stages ─────────────────────────────
   GDD values: base 10 °C, standard (non-modified) scale from the literature.
   These match the 2,700 GDD → R6 Black Layer reference for a 20-leaf product.
   ─────────────────────────────────────────────────────────────────────────── */
export type StageGroup = "vegetative" | "reproductive";

export interface CornStage {
  id: string;
  label: string;
  gdd: number;
  desc: string;
  detail: string;
  group: StageGroup;
  icon: React.ElementType;
  color: "green" | "amber" | "red";
}

export const CORN_STAGES: CornStage[] = [
  // ── Vegetative ──────────────────────────────────────────────────────────
  {
    id: "plant",
    label: "Plant",
    gdd: 0,
    desc: "Planting date",
    detail: "Seed in the ground. Day 0.",
    group: "vegetative",
    icon: CircleDot,
    color: "green",
  },
  {
    id: "VE",
    label: "VE",
    gdd: 110,
    desc: "Emergence",
    detail: "Coleoptile breaks soil surface. Photosynthesis begins. ~100–120 GDD.",
    group: "vegetative",
    icon: Sprout,
    color: "green",
  },
  {
    id: "V1",
    label: "V1",
    gdd: 150,
    desc: "1st Leaf Collar",
    detail: "First collar visible. Rounded leaf tip. Nodal roots developing.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V2",
    label: "V2",
    gdd: 200,
    desc: "2nd Leaf Collar",
    detail: "Plant relies on seed energy. Seminal roots at max size. ~200 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V3",
    label: "V3",
    gdd: 280,
    desc: "3rd Leaf Collar",
    detail: "Seed no longer supplying energy. Plant self-sustains via photosynthesis.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V4",
    label: "V4",
    gdd: 360,
    desc: "4th Leaf Collar",
    detail: "Critical weed control window. Yield loss risk from competition. ~360 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V5",
    label: "V5",
    gdd: 430,
    desc: "5th Leaf Collar",
    detail: "8–12 inches tall. Growing point still below ground. Leaf & ear shoot number being set.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V6",
    label: "V6",
    gdd: 520,
    desc: "6th Leaf Collar",
    detail: "Growing point now above soil. Susceptible to hail/frost/wind. ~520 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V7",
    label: "V7",
    gdd: 590,
    desc: "7th Leaf Collar",
    detail: "Kernel rows around the cob fixed. Plant begins determining kernels per row.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V8",
    label: "V8–V9",
    gdd: 680,
    desc: "8th–9th Leaf Collar",
    detail: "Rapid growth phase. Brace roots begin. Plant ~36 in tall. ~680–760 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V10",
    label: "V10–V11",
    gdd: 820,
    desc: "10th–11th Leaf Collar",
    detail: "New leaf every 2–3 days. Rapid nutrient uptake. Greensnap risk begins.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V12",
    label: "V12",
    gdd: 900,
    desc: "12th Leaf Collar",
    detail: "~10% total dry matter. All leaves formed. Half exposed to sunlight. ~900 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V13",
    label: "V13–V16",
    gdd: 955,
    desc: "13th–16th Leaf Collar",
    detail: "Kernels per row near final count. V15 ≈ 25% DM, ~2 weeks from silking. 955–1,150 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "V17",
    label: "V17+",
    gdd: 1300,
    desc: "17th+ Leaf Collar",
    detail: "Increasingly vulnerable to yield loss from hail/moisture stress. ~1,300 GDD.",
    group: "vegetative",
    icon: Leaf,
    color: "green",
  },
  {
    id: "VT",
    label: "VT",
    gdd: 1350,
    desc: "Tasseling",
    detail: "Pollen shed 4–6 days. 65% N, 50% P, 85% K absorbed. Hail very damaging. ~1,350 GDD.",
    group: "vegetative",
    icon: Wheat,
    color: "amber",
  },

  // ── Reproductive ────────────────────────────────────────────────────────
  {
    id: "R1",
    label: "R1",
    gdd: 1500,
    desc: "Silking",
    detail: "Silks visible. Pollination base→tip. Most critical yield stage. PM ≈ 50–55 days away. ~1,500 GDD.",
    group: "reproductive",
    icon: Sun,
    color: "amber",
  },
  {
    id: "R2",
    label: "R2",
    gdd: 1700,
    desc: "Blister",
    detail: "10–14 days post-silk. White kernels with clear fluid. 85% moisture. Drought kills kernels. ~1,700 GDD.",
    group: "reproductive",
    icon: Droplets,
    color: "amber",
  },
  {
    id: "R3",
    label: "R3",
    gdd: 1875,
    desc: "Milk",
    detail: "~20 days post-silk. Yellow kernels, milky fluid. 80% moisture. ~1,875 GDD.",
    group: "reproductive",
    icon: Droplets,
    color: "amber",
  },
  {
    id: "R4",
    label: "R4",
    gdd: 1950,
    desc: "Dough",
    detail: "~28 days post-silk. Dough-like starch. 70% moisture. ~50% max dry weight. ~1,950 GDD.",
    group: "reproductive",
    icon: Layers,
    color: "amber",
  },
  {
    id: "R5",
    label: "R5",
    gdd: 2300,
    desc: "Dent",
    detail: "~40 days post-silk. Kernels dented. 55–60% moisture. Milk line visible. ~90% DM by half-milk-line. ~2,300 GDD.",
    group: "reproductive",
    icon: Layers,
    color: "amber",
  },
  {
    id: "R6",
    label: "R6",
    gdd: 2700,
    desc: "Black Layer (Maturity)",
    detail: "~55 days post-silk. Black layer at kernel base. 100% DM. 30–35% moisture. Final yield set. ~2,700 GDD.",
    group: "reproductive",
    icon: FlaskConical,
    color: "amber",
  },
  {
    id: "harvest",
    label: "Harvest",
    gdd: 2700,
    desc: "Ready to harvest",
    detail: "Grain at target moisture. Field dry-down or mechanical harvest.",
    group: "reproductive",
    icon: Scissors,
    color: "red",
  },
];

const GROUP_LABELS: Record<StageGroup, string> = {
  vegetative: "Vegetative (V)",
  reproductive: "Reproductive (R)",
};

export default function GrowthLogForm({ farmId, onSuccess, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string>("plant");
  const [height, setHeight]         = useState("");
  const [ears, setEars]             = useState("");
  const [notes, setNotes]           = useState("");
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [openGroup, setOpenGroup]   = useState<StageGroup>("vegetative");

  const selected = CORN_STAGES.find(s => s.id === selectedId) ?? CORN_STAGES[0];

  const vStages = CORN_STAGES.filter(s => s.group === "vegetative");
  const rStages = CORN_STAGES.filter(s => s.group === "reproductive");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await postGrowthLog({
        farm_id: farmId,
        growth_progress_in_gdd: String(selected.gdd),
        height: height ? parseFloat(height) : undefined,
        n_ears: ears   ? parseInt(ears, 10)  : undefined,
        notes:  notes.trim() || undefined,
        observation_date: date ? new Date(date).toISOString() : undefined,
      });
      onSuccess();
    } catch { setError("Failed to save. Is the API running?"); }
    finally  { setSaving(false); }
  }

  function StageButton({ stage }: { stage: CornStage }) {
    const Icon   = stage.icon;
    const active = stage.id === selectedId;
    return (
      <button
        type="button"
        onClick={() => setSelectedId(stage.id)}
        title={stage.detail}
        className={`
          flex items-center gap-2 rounded-[--radius-sm] border px-2.5 py-2 text-left
          transition-all duration-150 hover:shadow-sm
          ${active
            ? "border-[--brand-mid] bg-[--brand-light] shadow-sm"
            : "border-[--border] bg-[--bg-elevated] hover:border-[--brand-light]"}
        `}
      >
        <Icon size={14} className={active ? "text-[--brand-mid] shrink-0" : "text-[--text-muted] shrink-0"} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-tight ${active ? "text-[--brand]" : "text-[--text-secondary]"}`}>
            {stage.label}
          </p>
          <p className="text-[9px] text-[--text-muted] leading-tight truncate">{stage.desc}</p>
        </div>
        {active && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[--brand-mid]" />
        )}
      </button>
    );
  }

  function GroupSection({ group, stages }: { group: StageGroup; stages: CornStage[] }) {
    const isOpen = openGroup === group;
    const hasSelected = stages.some(s => s.id === selectedId);
    return (
      <div className={`rounded-[--radius-sm] border overflow-hidden ${hasSelected ? "border-[--brand-light]" : "border-[--border]"}`}>
        <button
          type="button"
          onClick={() => setOpenGroup(isOpen ? (group === "vegetative" ? "reproductive" : "vegetative") : group)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors
            ${isOpen ? "bg-[--brand-light]" : "bg-[--bg-elevated] hover:bg-[--bg-surface]"}`}
        >
          <span className="label-caps">{GROUP_LABELS[group]}</span>
          <div className="flex items-center gap-2">
            {hasSelected && (
              <span className="text-[10px] font-semibold text-[--brand-mid]">
                {stages.find(s => s.id === selectedId)?.label}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-[--text-muted] transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {isOpen && (
          <div className="p-2 grid grid-cols-3 gap-1.5 bg-[--bg-surface]">
            {stages.map(s => <StageButton key={s.id} stage={s} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[--radius-xl] overflow-hidden shadow-[--shadow-lg] max-h-[95svh] flex flex-col">

        {/* Header */}
        <div className="bg-[--brand] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="display-italic text-2xl text-[--text-on-dark]">Log Observation</h2>
              <p className="text-[--text-on-dark]/60 text-xs mt-0.5">
                Select any date to backfill past records.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={submit} className="bg-[--bg-surface] overflow-y-auto flex flex-col gap-4 p-6">

          <Field label="Observation Date">
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={INPUT}
            />
          </Field>

          {/* Stage picker */}
          <div>
            <label className="label-caps block mb-1.5">
              Growth Stage Reached <span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="flex flex-col gap-1.5">
              <GroupSection group="vegetative" stages={vStages} />
              <GroupSection group="reproductive" stages={rStages} />
            </div>

            {/* Selected stage detail card */}
            <div className="mt-2 rounded-[--radius-sm] bg-[--brand-light] border border-[--brand-light] px-3 py-2.5 flex items-start gap-2.5">
              {(() => { const Icon = selected.icon; return <Icon size={15} className="text-[--brand-mid] mt-0.5 shrink-0" />; })()}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[--brand]">
                  {selected.label} — {selected.desc}
                  <span className="ml-2 font-normal text-[--brand-muted]">({selected.gdd} GDD)</span>
                </p>
                <p className="text-[10px] text-[--text-muted] leading-relaxed mt-0.5">{selected.detail}</p>
              </div>
            </div>

            {/* Reference link */}
            <p className="mt-1.5 text-[10px] text-[--text-muted]">
              Not sure which stage?{" "}
              <a
                href="https://www.cropscience.bayer.us/articles/bayer/corn-growth-stages-and-gdu-requirements"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--brand-mid] underline underline-offset-2 hover:text-[--brand] transition-colors"
              >
                See the corn growth stages guide
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)" hint="Measure from base to top leaf">
              <input
                type="number" min="0" step="0.1" placeholder="e.g. 85"
                value={height} onChange={e => setHeight(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="No. of Ears" hint="Count visible ear shoots">
              <input
                type="number" min="0" placeholder="e.g. 2"
                value={ears} onChange={e => setEars(e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="e.g. V6 confirmed, growing point above soil, nodal roots visible…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={INPUT + " resize-none"}
            />
          </Field>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-[--radius-sm] px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>Save Entry</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
